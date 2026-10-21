import { test } from '@japa/runner'
import VerifiedMiddleware from '#middleware/verified_middleware'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * A context with nothing but the user, which is all the middleware reads.
 */
function contextWith(user: { isEmailVerified?: boolean } | undefined) {
  return { auth: { user } } as unknown as HttpContext
}

test.group('Verified middleware', () => {
  test('lets a verified user through', async ({ assert }) => {
    const middleware = new VerifiedMiddleware()
    let called = false
    const next: NextFn = async () => {
      called = true
    }

    await middleware.handle(contextWith({ isEmailVerified: true }), next)

    assert.isTrue(called)
  })

  test('blocks a user that has not verified the email', async ({ assert }) => {
    const middleware = new VerifiedMiddleware()
    let called = false
    const next: NextFn = async () => {
      called = true
    }

    const error = await middleware
      .handle(contextWith({ isEmailVerified: false }), next)
      .catch((raised) => raised)

    assert.isFalse(called)
    assert.equal(error.code, 'E_EMAIL_NOT_VERIFIED')
    assert.equal(error.status, 403)
  })

  test('blocks an anonymous visitor', async ({ assert }) => {
    const middleware = new VerifiedMiddleware()

    const error = await middleware
      .handle(contextWith(undefined), async () => {})
      .catch((raised) => raised)

    assert.equal(error.code, 'E_EMAIL_NOT_VERIFIED')
  })
})
