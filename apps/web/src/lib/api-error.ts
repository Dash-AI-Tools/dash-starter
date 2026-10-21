import { TuyauError } from '@tuyau/core/client'

/**
 * A validation error returned by the API. The `code` is the machine-readable
 * rule that failed and stays the same in every locale.
 */
export type FieldError = {
  field: string
  code: string
  message: string
}

/**
 * The error shape the API returns for a failed validation.
 */
export type ValidationError = {
  code: 'E_VALIDATION_ERROR'
  errors: FieldError[]
}

/**
 * The error shape the API returns for any other failure.
 */
export type ApiError = {
  code: string
  message: string
}

/**
 * The error raised by the API client, normalized so every consumer can tell
 * what happened without knowing about HTTP.
 */
export class ApiRequestError extends Error {
  /** The HTTP status of the failed request. */
  readonly status: number
  /** The machine-readable error code returned by the API. */
  readonly code: string
  /** The localized message returned by the API. */
  readonly message: string
  /** The validation errors, when the request failed validation. */
  readonly errors: FieldError[]

  constructor(
    status: number,
    code: string,
    message: string,
    errors: FieldError[] = []
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.message = message
    this.errors = errors
  }

  /**
   * The validation errors indexed by field, ready to be spread into a form.
   */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.errors.map((error) => [error.field, error.message]))
  }
}

/**
 * The reason a request was rejected. Each case maps to a single place in the
 * interface, so the UI never inspects a status code directly.
 */
export type ApiFailure =
  /** The session is missing or expired: the user has to sign in again. */
  | { kind: 'unauthorized'; error: ApiRequestError }
  /** The request was rejected by the validation rules. */
  | { kind: 'validation'; error: ApiRequestError }
  /** The plan of the organization does not include the feature. */
  | { kind: 'payment_required'; error: ApiRequestError }
  /** The request was rate limited. */
  | { kind: 'rate_limited'; error: ApiRequestError }
  /** Any other failure. */
  | { kind: 'error'; error: ApiRequestError }

/**
 * Reads the body of a failed response, which is either a validation error or
 * a plain `{ code, message }` error.
 */
function readErrorBody(body: unknown): { code: string; message: string; errors: FieldError[] } {
  if (typeof body !== 'object' || body === null) {
    return { code: 'E_UNKNOWN_ERROR', message: '', errors: [] }
  }

  const payload = body as Partial<ValidationError & ApiError>
  const errors = Array.isArray(payload.errors) ? payload.errors : []

  return {
    code: payload.code ?? 'E_UNKNOWN_ERROR',
    message: payload.message ?? '',
    errors,
  }
}

/**
 * Turns the error thrown by the API client into a normalized failure.
 */
export function toApiFailure(error: unknown): ApiFailure {
  if (!(error instanceof TuyauError) || error.kind !== 'http') {
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return { kind: 'error', error: new ApiRequestError(0, 'E_UNKNOWN_ERROR', message) }
  }

  const status = error.status ?? 0
  const body = readErrorBody(error.response)
  const requestError = new ApiRequestError(status, body.code, body.message, body.errors)

  if (status === 401) {
    return { kind: 'unauthorized', error: requestError }
  }

  if (status === 422) {
    return { kind: 'validation', error: requestError }
  }

  if (status === 402) {
    return { kind: 'payment_required', error: requestError }
  }

  if (status === 429) {
    return { kind: 'rate_limited', error: requestError }
  }

  return { kind: 'error', error: requestError }
}
