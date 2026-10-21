import { HttpResponse, http } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { API_BASE_URL, client } from '@/lib/api'
import { toApiFailure, type ApiFailure } from '@/lib/api-error'
import { errorBody, server, validationBody } from '@/test/server'

const HEALTH = `${API_BASE_URL}/api/v1/health`

afterEach(() => server.resetHandlers())

/**
 * Calls the API and normalizes the failure, so every test asserts on the
 * same shape.
 */
async function callHealth(): Promise<ApiFailure> {
  try {
    await client.api.health.show({})
    throw new Error('The request was expected to fail')
  } catch (error) {
    return toApiFailure(error)
  }
}

describe('API status mapping', () => {
  it('maps a 401 to an unauthorized failure', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.json(errorBody, { status: 401 })))

    const failure = await callHealth()

    expect(failure.kind).toBe('unauthorized')
    expect(failure.error.status).toBe(401)
    expect(failure.error.code).toBe('E_UNAUTHORIZED')
  })

  it('maps a 422 to a validation failure with the field errors', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.json(validationBody, { status: 422 })))

    const failure = await callHealth()

    expect(failure.kind).toBe('validation')
    expect(failure.error.fieldErrors).toEqual({
      email: 'Introduce un correo electrónico válido',
    })
  })

  it('maps a 402 to a payment required failure', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.json(errorBody, { status: 402 })))

    const failure = await callHealth()

    expect(failure.kind).toBe('payment_required')
    expect(failure.error.status).toBe(402)
  })

  it('maps a 429 to a rate limited failure', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.json(errorBody, { status: 429 })))

    const failure = await callHealth()

    expect(failure.kind).toBe('rate_limited')
    expect(failure.error.status).toBe(429)
  })

  it('maps any other status to a generic failure', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.json(errorBody, { status: 500 })))

    const failure = await callHealth()

    expect(failure.kind).toBe('error')
    expect(failure.error.status).toBe(500)
  })

  it('maps a network failure to a generic failure', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.error()))

    const failure = await callHealth()

    expect(failure.kind).toBe('error')
    expect(failure.error.status).toBe(0)
  })
})

describe('API request headers', () => {
  it('sends the session cookies and the active locale', async () => {
    let headers: Headers | undefined

    server.use(
      http.get(HEALTH, ({ request }) => {
        headers = request.headers
        return HttpResponse.json({ status: 'ok' })
      })
    )

    document.cookie = 'locale=es; path=/'
    await client.api.health.show({})

    expect(headers?.get('Accept-Language')).toBe('es')
    expect(headers?.get('Accept')).toBe('application/json')
    document.cookie = 'locale=; path=/; max-age=0'
  })

  it('sends the CSRF token cookie back in the X-XSRF-TOKEN header', async () => {
    let headers: Headers | undefined

    server.use(
      http.get(HEALTH, ({ request }) => {
        headers = request.headers
        return HttpResponse.json({ status: 'ok' })
      })
    )

    document.cookie = 'XSRF-TOKEN=e%3Aabc123; path=/'
    await client.api.health.show({})

    expect(headers?.get('X-XSRF-TOKEN')).toBe('e:abc123')
    document.cookie = 'XSRF-TOKEN=; path=/; max-age=0'
  })
})
