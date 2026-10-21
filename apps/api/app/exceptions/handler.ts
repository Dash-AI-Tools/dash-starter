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
