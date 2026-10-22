import { registry } from '@dash/api/registry'
import { createTuyau } from '@tuyau/core/client'
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n'

/**
 * The event the client fires when a request is rejected because the session
 * is missing or has expired. The shell listens to it and sends the visitor
 * to the login page.
 */
export const SESSION_EXPIRED = 'dash:session-expired'

/**
 * The API is served from the same origin as the web app: the Vite dev proxy
 * forwards `/api` and `/mcp` during development and nginx does it in
 * production. The origin is spelled out so the client also works when it is
 * called with an absolute URL from a test.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? (typeof window === 'undefined' ? 'http://localhost' : window.location.origin)

/**
 * The typed client. Tuyau derives the route names, parameters, bodies and
 * response types from the API registry, so a change on the API side breaks
 * the typecheck here instead of failing at runtime.
 *
 * The session cookies travel with every request, and Tuyau appends the
 * `XSRF-TOKEN` cookie as the `X-XSRF-TOKEN` header, which is what Shield
 * checks on the state-changing requests.
 */
export const client = createTuyau({
  baseUrl: API_BASE_URL,
  registry,
  credentials: 'include',
  headers: { Accept: 'application/json' },
  hooks: {
    beforeRequest: [
      (request) => {
        /**
         * The locale travels with the request so the API answers with the
         * messages of the active language. The cookie wins over the browser
         * default, matching the locale resolution order of the API.
         */
        const locale = readLocaleCookie()
        if (locale) {
          request.headers.set('Accept-Language', locale)
        }
      },
    ],
    afterResponse: [
      (_request, _options, response) => {
        /**
         * A rejected request means the session is gone: the app sends the
         * visitor to the login page, from where they come back to the page
         * they were on.
         */
        if (response.status === 401) {
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED))
        }
      },
    ],
  },
})

export const urlFor = client.urlFor

/**
 * Uploads the avatar of the user. The picture travels as a multipart form
 * and the generated registry describes the JSON bodies only, so the body of
 * this request is sent outside of the typed arguments.
 */
export function uploadAvatar(file: File) {
  const body = new FormData()
  body.append('avatar', file)

  return client.api.profile.avatar({
    body,
  } as unknown as Parameters<typeof client.api.profile.avatar>[0])
}

/**
 * Reads the locale cookie written by the browser.
 */
function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null

  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))
  const value = match?.[1]
  return value === 'en' || value === 'es' ? value : null
}
