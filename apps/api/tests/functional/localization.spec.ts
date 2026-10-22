import { test } from '@japa/runner'
import { Browser } from '#tests/helpers/browser'

/**
 * The shape of a localized error response. The Tuyau registry types the
 * successful response of the route, so the error body is read explicitly.
 */
type ErrorBody = {
  code: string
  errors: { field: string; code: string; message: string }[]
}

function errorBody(response: { body(): unknown }): ErrorBody {
  return response.body() as ErrorBody
}

/**
 * Returns the error of a field, failing the test when the field is missing.
 */
function fieldError(
  assert: { isDefined: (value: unknown, message: string) => void },
  response: { body(): unknown },
  field: string
) {
  const error = errorBody(response).errors.find((entry) => entry.field === field)
  assert.isDefined(error, `Expected an error for the "${field}" field`)
  return error!
}

/**
 * The API localizes its error messages, but the machine-readable code stays
 * the same in every locale so clients can branch on it.
 */
test.group('Localized API responses', () => {
  test('a Spanish validation error is localized and keeps its rule code', async ({
    client,
    assert,
  }) => {
    const browser = new Browser(client)
    const response = await browser.post('/api/v1/auth/signup', {
      headers: { 'Accept-Language': 'es' },
      body: {
        fullName: 'Ada Lovelace',
        email: 'not-an-email',
        password: 'supersecret',
        passwordConfirmation: 'supersecret',
        terms: true,
      },
    })

    response.assertStatus(422)

    const body = errorBody(response)
    assert.equal(body.code, 'E_VALIDATION_ERROR')

    const emailError = fieldError(assert, response, 'email')
    assert.equal(emailError.code, 'email')
    assert.equal(emailError.message, 'Introduce un correo electrónico válido')
  })

  test('an English validation error uses the English catalog', async ({ client, assert }) => {
    const browser = new Browser(client)
    const response = await browser.post('/api/v1/auth/signup', {
      headers: { 'Accept-Language': 'en' },
      body: {
        fullName: 'Ada Lovelace',
        email: 'not-an-email',
        password: 'supersecret',
        passwordConfirmation: 'supersecret',
        terms: true,
      },
    })

    response.assertStatus(422)

    const emailError = fieldError(assert, response, 'email')
    assert.equal(emailError.code, 'email')
    assert.equal(emailError.message, 'Enter a valid email address')
  })

  test('the cookie choice wins over the Accept-Language header', async ({ client, assert }) => {
    /**
     * The session plugin overwrites the `Cookie` header, so the locale
     * cookie is added to the request's cookie jar instead.
     */
    const browser = new Browser(client)
    browser.setCookie('locale', 'es')

    const response = await browser.post('/api/v1/auth/signup', {
      headers: { 'Accept-Language': 'en' },
      body: {
        fullName: 'Ada Lovelace',
        email: 'not-an-email',
        password: 'supersecret',
        passwordConfirmation: 'supersecret',
        terms: true,
      },
    })

    response.assertStatus(422)

    const emailError = fieldError(assert, response, 'email')
    assert.equal(emailError.message, 'Introduce un correo electrónico válido')
  })

  test('the preference of the user wins over the browser language', async ({ client, assert }) => {
    const browser = new Browser(client)

    const signup = await browser.post('/api/v1/auth/signup', {
      body: {
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'supersecret',
        passwordConfirmation: 'supersecret',
        terms: true,
      },
    })

    signup.assertStatus(201)

    /**
     * The browser asks for Spanish, but the account was created in English.
     */
    const response = await browser.post('/api/v1/auth/signup', {
      headers: { 'Accept-Language': 'es' },
      body: {
        fullName: 'Ada Lovelace',
        email: 'not-an-email',
        password: 'supersecret',
        passwordConfirmation: 'supersecret',
        terms: true,
      },
    })

    response.assertStatus(422)

    const emailError = fieldError(assert, response, 'email')
    assert.equal(emailError.message, 'Enter a valid email address')
  })
})
