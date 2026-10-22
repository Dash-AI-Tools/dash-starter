import { createHash, randomBytes } from 'node:crypto'
import {
  E_INVITATION_INVALID,
  E_INVITATION_MISMATCH,
  E_SEAT_LIMIT_REACHED,
} from '#exceptions/errors'
import OrganizationInvitation from '#mails/organization_invitation'
import Invitation from '#models/invitation'
import Membership from '#models/membership'
import type { Role } from '#models/membership'
import type Organization from '#models/organization'
import type User from '#models/user'
import { entitlements } from '#services/entitlements'
import { usedSeats } from '#services/organizations'
import env from '#start/env'
import type { I18n } from '@adonisjs/i18n'
import mail from '@adonisjs/mail/services/main'
import { errors as VineErrors } from '@vinejs/vine'
import { DateTime } from 'luxon'

/**
 * How long an invitation stays valid.
 */
export const INVITATION_TTL_DAYS = 7

/**
 * The token of an invitation, in the form that travels by email. Only its
 * hash is stored, so a leak of the database does not hand out the
 * invitations.
 */
export function generateInvitationToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')

  return { token, hash: hashInvitationToken(token) }
}

/**
 * The hash of the token of an invitation.
 */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * The link that accepts an invitation. It opens the web app, not the API.
 */
export function invitationAcceptUrl(token: string): string {
  return `${env.get('WEB_URL')}/invitations/${token}/accept`
}

/**
 * Invites somebody to an organization and sends the invitation by email.
 *
 * A member of the organization cannot be invited again, and neither can
 * somebody with a pending invitation. The invitation takes a seat of the
 * plan, so the plan has to have one left.
 */
export async function inviteMember(
  organization: Organization,
  inviter: User,
  email: string,
  role: Role,
  i18n: I18n
): Promise<Invitation> {
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

  if ((await usedSeats(organization)) >= entitlements(organization).seats) {
    throw new E_SEAT_LIMIT_REACHED()
  }

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

  return invitation
}

/**
 * Accepts an invitation: the caller joins the organization with the role of
 * the invitation.
 */
export async function acceptInvitation(invitation: Invitation, user: User): Promise<Membership> {
  if (!invitation.isPending) {
    throw new E_INVITATION_INVALID()
  }

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

  return joined
}
