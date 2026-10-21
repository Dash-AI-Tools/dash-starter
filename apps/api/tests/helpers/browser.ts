import type { ApiClient, ApiResponse } from '@japa/api-client'

/**
 * Options accepted by the requests of the browser.
 */
type RequestOptions = {
  /** Extra headers sent with the request. */
  headers?: Record<string, string>
  /** The JSON body of the request. */
  body?: unknown
}

/**
 * The cookies of a response, as they travel on the wire.
 *
 * The Japa client decrypts the cookies of the answer, and a decrypted value
 * cannot be sent back: the session cookie is signed and the CSRF cookie is
 * encrypted. So the raw `set-cookie` header is the only source of truth.
 */
function rawCookies(response: ApiResponse): Record<string, string> {
  const header = response.header('set-cookie')
  const lines = Array.isArray(header) ? header : header ? [header] : []

  const cookies: Record<string, string> = {}
  for (const line of lines) {
    const [pair] = line.split(';')
    const separator = pair.indexOf('=')
    if (separator === -1) {
      continue
    }

    cookies[pair.slice(0, separator).trim()] = pair.slice(separator + 1).trim()
  }

  return cookies
}

/**
 * Decodes a cookie value without breaking on a malformed one.
 */
function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * A browser-like API client.
 *
 * The Japa client creates a fresh cookie jar for every request, so the
 * session would not survive a single call. This client keeps the cookies
 * between the requests and echoes the `XSRF-TOKEN` cookie back as the
 * `x-xsrf-token` header, which is what a browser does and what Shield
 * expects on the state-changing requests.
 *
 * The first state-changing request is preceded by a read of the session, the
 * way the web app reads it when it boots: the session cookie and the CSRF
 * token only exist after a request that ends well.
 */
export class Browser {
  #cookies: Record<string, string> = {}

  constructor(private client: ApiClient) {}

  /**
   * The cookies the browser holds right now.
   */
  get cookies(): Record<string, string> {
    return { ...this.#cookies }
  }

  /**
   * Puts a cookie in the jar of the browser, the way the page does when it
   * writes a cookie of its own.
   */
  setCookie(name: string, value: string) {
    this.#cookies[name] = value
  }

  get(url: string, options: RequestOptions = {}) {
    return this.#request('GET', url, options)
  }

  post(url: string, options: RequestOptions = {}) {
    return this.#request('POST', url, options)
  }

  /**
   * Sends a request with the cookies of the browser and stores the cookies
   * of the answer.
   */
  async #request(method: string, url: string, options: RequestOptions) {
    /**
     * The session is read before the first state-changing request, so the
     * browser holds the CSRF token the API asks for.
     */
    if (method !== 'GET' && !this.#cookies['XSRF-TOKEN']) {
      await this.get('/api/v1/auth/session')
    }

    const request = this.client.request(url, method)

    /**
     * The API redirects to the web app, which is not running during the
     * tests: the redirect itself is the answer under test.
     */
    request.redirects(0)

    /**
     * The jar is filled directly, because the `cookie` method of the Japa
     * client signs the value and the cookies of AdonisJS come already
     * signed or encrypted.
     */
    for (const [name, value] of Object.entries(this.#cookies)) {
      request.cookiesJar[name] = { name, value }
    }

    /**
     * Shield checks the token of the header against the secret kept in the
     * session, so the cookie is sent back unchanged.
     */
    const xsrfToken = this.#cookies['XSRF-TOKEN']
    if (xsrfToken) {
      request.header('x-xsrf-token', xsrfToken)
    }

    if (options.headers) {
      request.headers(options.headers)
    }

    if (options.body !== undefined) {
      request.json(options.body)
    }

    const response = (await request) as ApiResponse
    this.#store(response)

    return response
  }

  /**
   * Keeps the cookies of the answer, so the next request travels with them.
   */
  #store(response: ApiResponse) {
    for (const [name, value] of Object.entries(rawCookies(response))) {
      this.#cookies[name] = decode(value)
    }
  }
}
