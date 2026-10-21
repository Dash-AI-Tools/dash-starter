import { createError } from '@adonisjs/core/exceptions'

/**
 * The password reset token is unknown, was already used or has expired.
 */
export const E_INVALID_RESET_TOKEN = createError(
  'The reset token is invalid or has expired',
  'E_INVALID_RESET_TOKEN',
  422
)

/**
 * The action needs a verified email address, which the user has not
 * confirmed yet.
 */
export const E_EMAIL_NOT_VERIFIED = createError(
  'The email address is not verified',
  'E_EMAIL_NOT_VERIFIED',
  403
)
