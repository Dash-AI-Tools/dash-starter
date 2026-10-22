import { http } from 'msw'
import { setupServer } from 'msw/node'

/**
 * The API answers with a JSON body, so the tests assert on the exact shapes
 * the API produces.
 */
export const api = http

/**
 * The mock server used by the web tests. Each test declares the handlers it
 * needs, so the assertions stay close to the behavior under test.
 */
export const server = setupServer()

/**
 * A validation error as the API returns it.
 */
export const validationBody = {
  code: 'E_VALIDATION_ERROR',
  errors: [{ field: 'email', code: 'email', message: 'Introduce un correo electrónico válido' }],
}

/**
 * A plain error as the API returns it.
 */
export const errorBody = {
  code: 'E_UNAUTHORIZED',
  message: 'Debes iniciar sesión para acceder a este recurso',
}
