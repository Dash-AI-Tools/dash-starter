import { E_INVITATION_INVALID } from '#exceptions/errors'
import Invitation from '#models/invitation'
import { acceptInvitation, hashInvitationToken, inviteMember } from '#services/invitations'
import InvitationTransformer from '#transformers/invitation_transformer'
import MembershipTransformer from '#transformers/membership_transformer'
import { createInvitationValidator } from '#validators/organization'
import type { HttpContext } from '@adonisjs/core/http'
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

    const invitation = await inviteMember(organization, auth.getUserOrFail(), email, role, i18n)

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

    const membership = await acceptInvitation(invitation, auth.getUserOrFail())

    return serialize.withoutWrapping({
      membership: MembershipTransformer.transform(membership),
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
