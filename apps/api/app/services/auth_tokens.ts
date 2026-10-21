import { createHash, randomBytes } from 'node:crypto'
import PasswordResetToken from '#models/password_reset_token'
import type User from '#models/user'
import env from '#start/env'
import { signedUrlFor } from '@adonisjs/core/services/url_builder'
import { DateTime } from 'luxon'

/**
 * Purpose the verification links are signed for. A link signed for another
 * purpose is rejected, so a reset link cannot be replayed as a verification
 * link (and the other way round).
 */
export const EMAIL_VERIFICATION_PURPOSE = 'email-verification'

/**
 * The purpose the links that confirm a change of the email address are
 * signed for. They only move the address of the account, they never verify
 * the account itself.
 */
export const EMAIL_CHANGE_PURPOSE = 'email-change'

/** How long a verification link stays valid. */
export const EMAIL_VERIFICATION_TTL = '24h'

/** How long a link that confirms a change of the email address stays valid. */
export const EMAIL_CHANGE_TTL = '24h'

/** How long a password reset token stays valid, in minutes. */
export const PASSWORD_RESET_TTL_MINUTES = 60

/**
 * Builds the signed link that proves the ownership of the email address.
 *
 * The expiry travels inside the signed query string, so the API can tell an
 * expired link from a forged one.
 */
export function emailVerificationLink(user: User): string {
  const path = signedUrlFor('auth.email_verification.verify', undefined, {
    expiresIn: EMAIL_VERIFICATION_TTL,
    purpose: EMAIL_VERIFICATION_PURPOSE,
    qs: {
      user: user.id,
      expires: Date.now() + 24 * 60 * 60 * 1000,
    },
  })

  return `${env.get('APP_URL')}${path}`
}

/**
 * Builds the signed link that confirms the ownership of the new address of
 * an account. The address travels inside the signed query string, so it
 * cannot be swapped on the way.
 */
export function emailChangeLink(user: User, email: string): string {
  const path = signedUrlFor('auth.email_change.verify', undefined, {
    expiresIn: EMAIL_CHANGE_TTL,
    purpose: EMAIL_CHANGE_PURPOSE,
    qs: {
      user: user.id,
      email,
      expires: Date.now() + 24 * 60 * 60 * 1000,
    },
  })

  return `${env.get('APP_URL')}${path}`
}

/**
 * Hashes a token before it touches the database, so a leaked dump cannot be
 * used to reset somebody else's password.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Creates a single-use password reset token and returns its raw value. Only
 * the hash is stored, so the raw token exists just long enough to build the
 * email.
 */
export async function createPasswordResetToken(user: User): Promise<string> {
  const token = randomBytes(32).toString('base64url')

  await PasswordResetToken.create({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: DateTime.now().plus({ minutes: PASSWORD_RESET_TTL_MINUTES }),
  })

  return token
}

/**
 * Consumes a password reset token and returns the user it belongs to. The
 * token is deleted, so it cannot be used twice.
 */
export async function consumePasswordResetToken(token: string): Promise<User | null> {
  const record = await PasswordResetToken.query()
    .where('token_hash', hashToken(token))
    .preload('user')
    .first()

  if (!record) {
    return null
  }

  await record.delete()

  if (record.expiresAt.toMillis() < Date.now()) {
    return null
  }

  return record.user
}
