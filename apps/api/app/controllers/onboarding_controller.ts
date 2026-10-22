import {
  E_INVITATION_INVALID,
  E_ONBOARDING_NOT_STARTED,
  E_SEAT_LIMIT_REACHED,
} from '#exceptions/errors'
import Welcome from '#mails/welcome'
import Invitation from '#models/invitation'
import type Organization from '#models/organization'
import type User from '#models/user'
import { entitlements } from '#services/entitlements'
import { acceptInvitation, inviteMember } from '#services/invitations'
import { onboardingFor, pendingInvitationsFor, saveProgress } from '#services/onboarding'
import { usedSeats } from '#services/organizations'
import MembershipTransformer from '#transformers/membership_transformer'
import {
  onboardingInvitesValidator,
  onboardingPlanValidator,
  useCaseValidator,
} from '#validators/onboarding'
import type { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

export default class OnboardingController {
  /**
   * The state of the setup of the organization of the user, with the
   * invitations that wait for an answer.
   */
  async show({ auth, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    return serialize.withoutWrapping({
      onboarding: await this.state(user),
    })
  }

  /**
   * Saves the profile of the use case of the organization: the size of the
   * team and what the organization will use the product for.
   */
  async useCase(ctx: HttpContext) {
    const { request, auth, serialize } = ctx

    const { teamSize, useCase } = await request.validateUsing(useCaseValidator)
    const organization = await this.organizationInProgress(auth.getUserOrFail())

    await saveProgress(organization, { teamSize, useCase })

    return serialize.withoutWrapping({
      onboarding: await this.state(auth.getUserOrFail()),
    })
  }

  /**
   * Sends the invitations of the team. The list is empty when the user skips
   * the step, and then no invitation is sent.
   */
  async invites(ctx: HttpContext) {
    const { request, auth, serialize, i18n } = ctx

    const { emails } = await request.validateUsing(onboardingInvitesValidator)
    const user = auth.getUserOrFail()
    const organization = await this.organizationInProgress(user)
    const invited = emails ?? []

    /**
     * The whole list is checked before the first invitation is sent, so a
     * plan without enough seats does not leave half of the team invited.
     */
    if ((await usedSeats(organization)) + invited.length > entitlements(organization).seats) {
      throw new E_SEAT_LIMIT_REACHED()
    }

    for (const email of invited) {
      await inviteMember(organization, user, email, 'member', i18n)
    }

    await saveProgress(organization, { invitesSentAt: DateTime.now().toISO() })

    return serialize.withoutWrapping({
      onboarding: await this.state(user),
    })
  }

  /**
   * Saves the plan the user chose.
   *
   * shortcut: the paid plans start a checkout, which arrives with the
   * billing group. Until then the choice is only recorded, and the setup
   * finishes on the free plan.
   */
  async plan(ctx: HttpContext) {
    const { request, auth, serialize } = ctx

    const { plan, interval } = await request.validateUsing(onboardingPlanValidator)
    const organization = await this.organizationInProgress(auth.getUserOrFail())

    await saveProgress(organization, { plan: { key: plan, interval } })

    return serialize.withoutWrapping({
      onboarding: await this.state(auth.getUserOrFail()),
    })
  }

  /**
   * Finishes the setup: the organization is marked as ready and the welcome
   * email is on its way.
   */
  async complete(ctx: HttpContext) {
    const { auth, serialize } = ctx

    const user = auth.getUserOrFail()
    const organization = await this.organizationInProgress(user)

    organization.onboardedAt = DateTime.now()
    await organization.save()

    /**
     * The email travels in the language of the user, who is the one who
     * reads it.
     */
    await mail.sendLater(new Welcome(user, user.locale))

    return serialize.withoutWrapping({
      onboarding: await this.state(user, organization),
    })
  }

  /**
   * Accepts one of the pending invitations of the user. The invitation is
   * addressed to the email address of the account, so the caller does not
   * need the token of the link that was sent by email.
   */
  async acceptInvitation(ctx: HttpContext) {
    const { auth, serialize } = ctx

    const invitation = await Invitation.query()
      .where('id', Number(ctx.params.id))
      .preload('organization')
      .first()

    if (!invitation) {
      throw new E_INVITATION_INVALID()
    }

    const membership = await acceptInvitation(invitation, auth.getUserOrFail())

    return serialize.withoutWrapping({
      membership: MembershipTransformer.transform(membership),
    })
  }

  /**
   * The state of the setup, as the web app reads it.
   */
  private async state(user: User, organization?: Organization | null) {
    const onboarding = await onboardingFor(user)
    const current = organization ?? onboarding.organization
    const invitations = await pendingInvitationsFor(user)

    return {
      step: onboarding.step,
      organization: current
        ? {
            id: current.id,
            name: current.name,
            slug: current.slug,
            defaultLocale: current.defaultLocale,
          }
        : null,
      teamSize: onboarding.state?.teamSize ?? null,
      useCase: onboarding.state?.useCase ?? null,
      plan: onboarding.state?.plan ?? null,
      invitations: invitations.map((invitation) => ({
        id: invitation.id,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        organization: {
          name: invitation.organization.name,
          slug: invitation.organization.slug,
        },
      })),
    }
  }

  /**
   * The organization that is being set up. The setup cannot be saved without
   * an organization, so the request is refused when there is none.
   */
  private async organizationInProgress(user: User): Promise<Organization> {
    const { organization, step } = await onboardingFor(user)

    if (!organization || step === 'done') {
      throw new E_ONBOARDING_NOT_STARTED()
    }

    return organization
  }
}
