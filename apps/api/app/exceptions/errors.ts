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

/**
 * The setup of the organization has not started yet, so there is nothing to
 * save the progress in.
 */
export const E_ONBOARDING_NOT_STARTED = createError(
  'The setup of the organization has not started yet',
  'E_ONBOARDING_NOT_STARTED',
  422
)

/**
 * The database has no free plan, so the limits of the organization cannot be
 * read. The catalog of plans is written by the seeder.
 */
export const E_NO_DEFAULT_PLAN = createError(
  'There is no free plan in the database',
  'E_NO_DEFAULT_PLAN',
  500
)

/**
 * The organization already has a subscription, so it has to change the plan
 * instead of buying a new one.
 */
export const E_SUBSCRIPTION_EXISTS = createError(
  'The organization already has a subscription',
  'E_SUBSCRIPTION_EXISTS',
  409
)

/**
 * The organization has no subscription, so there is nothing to change or to
 * cancel.
 */
export const E_NO_SUBSCRIPTION = createError(
  'The organization has no subscription',
  'E_NO_SUBSCRIPTION',
  404
)

/**
 * The webhook of the payment provider did not carry a valid signature.
 */
export const E_INVALID_WEBHOOK_SIGNATURE = createError(
  'The signature of the webhook is not valid',
  'E_INVALID_WEBHOOK_SIGNATURE',
  401
)

/**
 * The plan does not exist, is not active or has no product in the payment
 * provider yet, so it cannot be bought.
 */
export const E_PLAN_UNAVAILABLE = createError(
  'The plan is not available',
  'E_PLAN_UNAVAILABLE',
  422
)

/**
 * The organization has used all the AI credits of its plan, so the call is
 * refused before it reaches the provider.
 */
export const E_AI_QUOTA_EXCEEDED = createError(
  'The organization has used all the AI credits of its plan',
  'E_AI_QUOTA_EXCEEDED',
  402
)

/**
 * The provider did not answer, or answered with an error. The details of the
 * provider never reach the client.
 */
export const E_AI_UNAVAILABLE = createError(
  'The AI provider is not available',
  'E_AI_UNAVAILABLE',
  503
)

/**
 * The alias of the request points at a model that cannot do what the feature
 * needs, or at no model at all. The name of the alias is part of the message,
 * so the misconfiguration is easy to find.
 */
export const E_AI_ALIAS_UNAVAILABLE = createError(
  'The AI alias "%s" is not available for this request',
  'E_AI_ALIAS_UNAVAILABLE',
  500
)
