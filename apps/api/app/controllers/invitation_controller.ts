import {
  E_INVITATION_INVALID,
  E_INVITATION_MISMATCH,
  E_SEAT_LIMIT_REACHED,
} from '#exceptions/errors'
import OrganizationInvitation from '#mails/organization_invitation'
import Invitation from '#models/invitation'
import Membership from '#models/membership'
import { entitlements } from '#services/entitlements'
import {
  generateInvitationToken,
  hashInvitationToken,
  INVITATION_TTL_DAYS,
  invitationAcceptUrl,
} from '#services/invitations'
import { usedSeats } from '#services/organizations'
import InvitationTransformer from '#transformers/invitation_transformer'
import MembershipTransformer from '#transformers/membership_transformer'
import { createInvitationValidator } from '#validators/organization'
import type { HttpContext } from '@adonisjs/core/http'
import mail from '@adonisjs/mail/services/main'
import { errors as VineErrors } from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class InvitationController {
  /**
   * The details of an invitation, for the page that accepts it.
   *
   * The token is the secret of the invitation, so the holder of the token is
   * the person the invitation was sent to.
   */
  async show({ params, serialize }: HttpContext) {
    const invitation = await this.findInvitation(params.token)

    return serialize.withoutWrapping({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        status: this.status(invitation),
        organization: {
          name: invitation.organization.name,
          slug: invitation.organization.slug,
        },
      },
    })
  }

  /**
   * Invites somebody to the organization and sends the invitation by email.
   */
  async store(ctx: HttpContext) {
    const { request, auth, organization, membership, bouncer, response, serialize, i18n } = ctx

    await bouncer.authorize('manageInvitations', membership)

    const { email, role } = await request.validateUsing(createInvitationValidator)

    /**
     * A member of the organization cannot be invited again.
     */
    const member = await Membership.query()
      .where('organizationId', organization.id)
      .whereHas('user', (query) => query.where('email', email))
      .first()

    if (member) {
      throw new VineErrors.E_VALIDATION_ERROR([
        {
          field: 'email',
          message: i18n.t('organizations.already_member', { email }),
          rule: 'already_member',
        },
      ])
    }

    /**
     * Neither can somebody with a pending invitation.
     */
    const pending = await Invitation.query()
      .where('organizationId', organization.id)
      .where('email', email)
      .whereNull('acceptedAt')
      .whereNull('revokedAt')
      .where('expiresAt', '>', new Date())
      .first()

    if (pending) {
      throw new VineErrors.E_VALIDATION_ERROR([
        {
          field: 'email',
          message: i18n.t('organizations.already_invited', { email }),
          rule: 'already_invited',
        },
      ])
    }

    /**
     * The invitation takes a seat of the plan, so the plan has to have one
     * left.
     */
    if ((await usedSeats(organization)) >= entitlements(organization).seats) {
      throw new E_SEAT_LIMIT_REACHED()
    }

    const inviter = auth.getUserOrFail()
    const { token, hash } = generateInvitationToken()

    const invitation = await Invitation.create({
      organizationId: organization.id,
      invitedById: inviter.id,
      email,
      role,
      tokenHash: hash,
      expiresAt: DateTime.now().plus({ days: INVITATION_TTL_DAYS }),
    })

    /**
     * The invitation travels in the language of the organization, so every
     * member of the team reads it in the same language.
     */
    await mail.sendLater(
      new OrganizationInvitation({
        email,
        organizationName: organization.name,
        inviterName: inviter.fullName,
        acceptUrl: invitationAcceptUrl(token),
        expiresAt: invitation.expiresAt.toJSDate(),
        locale: organization.defaultLocale,
      })
    )

    response.status(201)

    return serialize.withoutWrapping({
      invitation: InvitationTransformer.transform(invitation),
    })
  }

  /**
   * The invitations of the organization that are still waiting for an
   * answer.
   */
  async index({ organization, membership, bouncer, serialize }: HttpContext) {
    await bouncer.authorize('manageInvitations', membership)

    const invitations = await Invitation.query()
      .where('organizationId', organization.id)
      .whereNull('acceptedAt')
      .whereNull('revokedAt')
      .preload('invitedBy')
      .orderBy('createdAt', 'desc')

    return serialize.withoutWrapping({
      invitations: InvitationTransformer.transform(invitations),
    })
  }

  /**
   * Revokes an invitation, so the link stops working.
   */
  async destroy(ctx: HttpContext) {
    const { organization, membership, bouncer, i18n } = ctx

    await bouncer.authorize('manageInvitations', membership)

    const invitation = await Invitation.query()
      .where('organizationId', organization.id)
      .where('id', Number(ctx.params.id))
      .first()

    if (!invitation) {
      throw new E_INVITATION_INVALID()
    }

    if (invitation.acceptedAt) {
      throw new VineErrors.E_VALIDATION_ERROR([
        {
          field: 'id',
          message: i18n.t('organizations.invitation_not_pending'),
          rule: 'invitation_not_pending',
        },
      ])
    }

    invitation.revokedAt = DateTime.now()
    await invitation.save()

    return { success: true }
  }

  /**
   * Accepts an invitation: the caller joins the organization with the role
   * of the invitation.
   */
  async accept(ctx: HttpContext) {
    const { auth, serialize } = ctx

    const invitation = await this.findInvitation(ctx.params.token)

    if (!invitation.isPending) {
      throw new E_INVITATION_INVALID()
    }

    const user = auth.getUserOrFail()

    if (String(invitation.email).toLowerCase() !== String(user.email).toLowerCase()) {
      throw new E_INVITATION_MISMATCH()
    }

    const membership = await Membership.query()
      .where('organizationId', invitation.organizationId)
      .where('userId', user.id)
      .first()

    const joined =
      membership ??
      (await Membership.create({
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
      }))

    invitation.acceptedAt = DateTime.now()
    await invitation.save()
    await joined.load('user')

    return serialize.withoutWrapping({
      membership: MembershipTransformer.transform(joined),
    })
  }

  /**
   * The invitation of a token. The token is only kept as a hash, so it is
   * hashed again before looking it up.
   */
  private async findInvitation(token: string) {
    const invitation = await Invitation.query()
      .where('tokenHash', hashInvitationToken(token))
      .preload('organization')
      .first()

    if (!invitation) {
      throw new E_INVITATION_INVALID()
    }

    return invitation
  }

  /**
   * The state of an invitation, so the page that accepts it can tell the
   * user what happened.
   */
  private status(invitation: Invitation): 'pending' | 'expired' | 'revoked' | 'accepted' {
    if (invitation.acceptedAt) {
      return 'accepted'
    }

    if (invitation.revokedAt) {
      return 'revoked'
    }

    if (invitation.expiresAt.toMillis() <= Date.now()) {
      return 'expired'
    }

    return 'pending'
  }
}
