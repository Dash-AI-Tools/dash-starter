import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler, errors as HttpErrors } from '@adonisjs/core/http'
import { errors as LimiterErrors } from '@adonisjs/limiter'

/**
 * Maps a status code to the catalog key holding its default message. The
 * message is translated into the locale resolved for the request, while the
 * error code stays locale-independent so clients can branch on it.
 */
const STATUS_MESSAGE_KEYS: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  402: 'payment_required',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'unprocessable',
  429: 'too_many_requests',
  500: 'internal_server_error',
}

/**
 * Errors that carry a status and a message of their own. The catalog key
 * holds the localized text, while the code stays locale-independent.
 */
const ERROR_OVERRIDES: Record<string, { status: number; message: string }> = {
  E_INVALID_CREDENTIALS: { status: 401, message: 'invalid_credentials' },
  E_INVALID_RESET_TOKEN: { status: 422, message: 'invalid_reset_token' },
  E_EMAIL_NOT_VERIFIED: { status: 403, message: 'email_not_verified' },
  E_LAST_OWNER: { status: 422, message: 'last_owner' },
  E_MEMBERSHIP_NOT_FOUND: { status: 404, message: 'membership_not_found' },
  E_SEAT_LIMIT_REACHED: { status: 402, message: 'seat_limit_reached' },
  E_INVITATION_MISMATCH: { status: 403, message: 'invitation_mismatch' },
  E_INVITATION_INVALID: { status: 404, message: 'invitation_invalid' },
  E_ONBOARDING_NOT_STARTED: { status: 422, message: 'onboarding_not_started' },
  E_NO_DEFAULT_PLAN: { status: 500, message: 'no_default_plan' },
  E_SUBSCRIPTION_EXISTS: { status: 409, message: 'subscription_exists' },
  E_NO_SUBSCRIPTION: { status: 404, message: 'no_subscription' },
  E_INVALID_WEBHOOK_SIGNATURE: { status: 401, message: 'invalid_webhook_signature' },
  E_PLAN_UNAVAILABLE: { status: 422, message: 'plan_unavailable' },
  E_AI_QUOTA_EXCEEDED: { status: 402, message: 'ai_quota_exceeded' },
  E_AI_UNAVAILABLE: { status: 503, message: 'ai_unavailable' },
  E_AI_ALIAS_UNAVAILABLE: { status: 500, message: 'ai_alias_unavailable' },
  E_CONVERSATION_NOT_FOUND: { status: 404, message: 'conversation_not_found' },
  E_INVALID_API_KEY: { status: 401, message: 'invalid_api_key' },
  E_API_KEY_NOT_FOUND: { status: 404, message: 'api_key_not_found' },
  E_MCP_NOT_ENABLED: { status: 403, message: 'mcp_not_enabled' },
}

/**
 * English text used when the request never reached the locale middleware.
 */
const DEFAULT_MESSAGES: Record<string, string> = {
  bad_request: 'The request could not be processed',
  unauthorized: 'You must sign in to access this resource',
  payment_required: 'Your plan does not include this feature',
  forbidden: 'You are not allowed to perform this action',
  not_found: 'The requested resource was not found',
  conflict: 'The request conflicts with the current state of the resource',
  unprocessable: 'The request could not be processed',
  too_many_requests: 'Too many requests. Please try again later',
  internal_server_error: 'Something went wrong on our side. Please try again',
  invalid_credentials: 'The email or password is not correct',
  invalid_reset_token: 'This reset link is invalid or has expired',
  email_not_verified: 'Please verify your email address to continue',
  last_owner: 'An organization must always have at least one owner',
  membership_not_found: 'The member was not found',
  seat_limit_reached: 'Your plan has no seats left. Upgrade to invite more people',
  invitation_mismatch: 'This invitation was sent to a different email address',
  invitation_invalid: 'This invitation link is not valid',
  onboarding_not_started: 'The setup of the organization has not started yet',
  no_default_plan: 'There is no free plan in the database. Run the seeder to create it',
  subscription_exists: 'The organization already has a subscription. Change the plan instead',
  no_subscription: 'The organization has no subscription',
  invalid_webhook_signature: 'The signature of the webhook is not valid',
  plan_unavailable: 'This plan is not available',
  ai_quota_exceeded: 'Your organization has used all the AI credits of its plan',
  ai_unavailable: 'The AI is temporarily unavailable. Please try again',
  ai_alias_unavailable: 'This feature is not available with the AI model it is configured with',
  conversation_not_found: 'The conversation was not found',
  invalid_api_key: 'The API key is not valid',
  api_key_not_found: 'The API key was not found',
  mcp_not_enabled: 'The MCP server is not available on your plan. Upgrade to unlock it',
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    const httpError = this.toHttpError(error)

    /**
     * Validation errors carry one entry per failed field. Each entry keeps
     * the machine-readable rule code and gets a localized message.
     */
    if (httpError.code === 'E_VALIDATION_ERROR' && 'messages' in httpError) {
      const messages = (
        httpError.messages as { field: string; message: string; rule: string }[]
      ).map((message) => ({
        field: message.field,
        code: message.rule,
        message: message.message,
      }))

      ctx.response.status(httpError.status).send({ code: httpError.code, errors: messages })
      return
    }

    /**
     * A route that does not exist is a 404, not a 500.
     */
    if (httpError instanceof HttpErrors.E_ROUTE_NOT_FOUND) {
      ctx.response.status(404).send({
        code: 'E_ROUTE_NOT_FOUND',
        message: this.translate(ctx, 'not_found'),
      })
      return
    }

    /**
     * A rate limit carries the headers that tell the client when it can
     * try again.
     */
    if (httpError instanceof LimiterErrors.ThrottleException) {
      for (const [header, value] of Object.entries(httpError.getDefaultHeaders())) {
        ctx.response.header(header, value)
      }

      ctx.response.status(429).send({
        code: httpError.code || 'E_TOO_MANY_REQUESTS',
        message: this.translate(ctx, 'too_many_requests'),
      })
      return
    }

    const override = ERROR_OVERRIDES[httpError.code || '']

    ctx.response.status(override?.status ?? httpError.status).send({
      code: httpError.code || 'E_UNKNOWN_ERROR',
      message: this.translate(
        ctx,
        override?.message ?? STATUS_MESSAGE_KEYS[httpError.status] ?? 'internal_server_error'
      ),
    })
  }

  /**
   * The method is used to report error to the logging service or
   * a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }

  /**
   * Translate a catalog key with the locale resolved for the request. Falls
   * back to the error message when the catalog has no entry for the key, and
   * to the default English text when the request never reached the locale
   * middleware.
   */
  private translate(ctx: HttpContext, key: string): string {
    const fallback = DEFAULT_MESSAGES[key] ?? DEFAULT_MESSAGES.internal_server_error

    if (!ctx.i18n) {
      return fallback
    }

    const message = ctx.i18n.t(`errors.${key}`)
    return message.startsWith('translation missing') ? fallback : message
  }
}
