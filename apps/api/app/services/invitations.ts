import { createHash, randomBytes } from 'node:crypto'
import env from '#start/env'

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
