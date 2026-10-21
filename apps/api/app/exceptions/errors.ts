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

/**
 * The organization of the request does not exist, or the caller does not
 * belong to it. Both answers are the same, so the API never reveals the
 * organizations of other tenants.
 */
export const E_ORGANIZATION_NOT_FOUND = createError(
  'The organization was not found',
  'E_ORGANIZATION_NOT_FOUND',
  404
)

/**
 * The organization has no owner left, so the change is refused.
 */
export const E_LAST_OWNER = createError(
  'An organization must always have at least one owner',
  'E_LAST_OWNER',
  422
)

/**
 * The member is not part of the organization of the request.
 */
export const E_MEMBERSHIP_NOT_FOUND = createError(
  'The member was not found',
  'E_MEMBERSHIP_NOT_FOUND',
  404
)

/**
 * The plan of the organization has no seats left.
 */
export const E_SEAT_LIMIT_REACHED = createError(
  'The plan of the organization has no seats left',
  'E_SEAT_LIMIT_REACHED',
  402
)

/**
 * The invitation was sent to another email address.
 */
export const E_INVITATION_MISMATCH = createError(
  'The invitation was sent to another email address',
  'E_INVITATION_MISMATCH',
  403
)

/**
 * The invitation does not exist, was already used, was revoked or expired.
 */
export const E_INVITATION_INVALID = createError(
  'The invitation is not valid',
  'E_INVITATION_INVALID',
  404
)
