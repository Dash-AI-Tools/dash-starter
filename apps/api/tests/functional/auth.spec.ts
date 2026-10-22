import { test } from '@japa/runner'
import { TERMS_VERSION } from '#legal'
import ResetPassword from '#mails/reset_password'
import VerifyEmail from '#mails/verify_email'
import User from '#models/user'
import { EMAIL_VERIFICATION_PURPOSE } from '#services/auth_tokens'
import { Browser } from '#tests/helpers/browser'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { signedUrlFor } from '@adonisjs/core/services/url_builder'

/**
 * A valid sign-up payload. The tests change the parts they need.
 */
function signupPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'supersecret',
    passwordConfirmation: 'supersecret',
    terms: true,
    ...overrides,
  }
}

/**
 * Creates an account directly in the database, without going through the
 * sign-up endpoint.
 */
async function createUser(email = 'ada@example.com') {
  return User.create({
    fullName: 'Ada Lovelace',
    email,
    password: 'supersecret',
    locale: 'en',
    termsVersion: '2026-01-01',
  })
}

/**
 * The number of accounts with the given address.
 */
async function countUsers(email: string) {
  const row = await db.query().from('users').where('email', email).count('* as total').firstOrFail()
  return Number(row.total)
}

/**
 * The path of a link of the API, so the test client can open it.
 */
function pathOf(url: string): string {
  const { pathname, search } = new URL(url)
  return `${pathname}${search}`
}

/**
 * The token of a password reset link.
 */
function tokenOf(url: string): string {
  return new URL(url).searchParams.get('token') ?? ''
}

/**
 * A verification link that expired an hour ago.
 */
function expiredVerificationLink(userId: number): string {
  const path = signedUrlFor('auth.email_verification.verify', undefined, {
    expiresIn: '-1h',
    purpose: EMAIL_VERIFICATION_PURPOSE,
    qs: { user: userId, expires: Date.now() - 60 * 60 * 1000 },
  })

  return `${env.get('APP_URL')}${path}`
}

test.group('Sign up', () => {
  test('creates the account, sends the verification email and signs the visitor in', async ({
    client,
    assert,
  }) => {
    const fakeMailer = mail.fake()
    const browser = new Browser(client)

    const response = await browser.post('/api/v1/auth/signup', {
      body: signupPayload(),
    })

    response.assertStatus(201)
    assert.equal(response.body().user.email, 'ada@example.com')
    assert.equal(response.body().user.fullName, 'Ada Lovelace')
    assert.equal(response.body().redirectTo, '/onboarding')

    /**
     * The account exists and is not verified yet.
     */
    const user = await User.findBy('email', 'ada@example.com')
    assert.isNotNull(user)
    assert.isNull(user!.emailVerifiedAt)

    /**
     * The account records the version of the terms it accepted.
     */
    assert.equal(user!.termsVersion, TERMS_VERSION)
    assert.isNotNull(user!.termsAcceptedAt)

    /**
     * The verification email is on its way.
     */
    fakeMailer.mails.assertQueued(VerifyEmail)

    /**
     * The visitor is signed in: the session cookie opens the profile.
     */
    const profile = await browser.get('/api/v1/account/profile')
    profile.assertStatus(200)
    assert.equal(profile.body().data.email, 'ada@example.com')

    /**
     * The payload of a user never carries the password nor its hash.
     */
    const keys = Object.keys(profile.body().data)
    assert.equal(
      keys.some((key) => key.toLowerCase().includes('password')),
      false
    )
  })

  test('rejects an email that already has an account', async ({ client, assert }) => {
    await createUser('duplicate@example.com')

    const browser = new Browser(client)
    const response = await browser.post('/api/v1/auth/signup', {
      body: signupPayload({ email: 'duplicate@example.com' }),
    })

    response.assertStatus(422)

    const error = response.body().errors.find((entry: { field: string }) => entry.field === 'email')
    assert.isDefined(error)
    assert.equal(error.code, 'database.unique')

    /**
     * No second account was created.
     */
    assert.equal(await countUsers('duplicate@example.com'), 1)
  })

  test('rejects the sign up when the terms are not accepted', async ({ client, assert }) => {
    const browser = new Browser(client)
    const response = await browser.post('/api/v1/auth/signup', {
      body: signupPayload({ email: 'noterms@example.com', terms: false }),
    })

    response.assertStatus(422)

    const error = response.body().errors.find((entry: { field: string }) => entry.field === 'terms')
    assert.isDefined(error)
    assert.equal(error.code, 'accepted')

    assert.equal(await countUsers('noterms@example.com'), 0)
  })
})

test.group('Login and logout', () => {
  test('signs a user in with the right credentials', async ({ client, assert }) => {
    await createUser()

    const browser = new Browser(client)
    const response = await browser.post('/api/v1/auth/login', {
      body: { email: 'ada@example.com', password: 'supersecret' },
    })

    response.assertStatus(200)
    assert.equal(response.body().user.email, 'ada@example.com')
    assert.equal(response.body().redirectTo, '/app')

    const profile = await browser.get('/api/v1/account/profile')
    profile.assertStatus(200)
    assert.equal(profile.body().data.email, 'ada@example.com')
  })

  test('answers with the same error for a wrong password and an unknown email', async ({
    client,
    assert,
  }) => {
    await createUser()

    const browser = new Browser(client)

    const wrongPassword = await browser.post('/api/v1/auth/login', {
      body: { email: 'ada@example.com', password: 'wrong-password' },
    })
    wrongPassword.assertStatus(401)

    const unknownEmail = await browser.post('/api/v1/auth/login', {
      body: { email: 'nobody@example.com', password: 'supersecret' },
    })
    unknownEmail.assertStatus(401)

    assert.equal(wrongPassword.body().message, unknownEmail.body().message)
    assert.equal(wrongPassword.body().code, 'E_INVALID_CREDENTIALS')
  })

  test('keeps a same-origin redirect and drops the foreign ones', async ({ client, assert }) => {
    await createUser()

    const browser = new Browser(client)

    const sameOrigin = await browser.post('/api/v1/auth/login', {
      body: {
        email: 'ada@example.com',
        password: 'supersecret',
        redirectTo: '/app/acme/settings',
      },
    })
    sameOrigin.assertStatus(200)
    assert.equal(sameOrigin.body().redirectTo, '/app/acme/settings')

    const foreign = await browser.post('/api/v1/auth/login', {
      body: {
        email: 'ada@example.com',
        password: 'supersecret',
        redirectTo: 'https://evil.example.com/steal',
      },
    })
    foreign.assertStatus(200)
    assert.equal(foreign.body().redirectTo, '/app')
  })

  test('ends the session on logout', async ({ client }) => {
    await createUser()

    const browser = new Browser(client)
    await browser.post('/api/v1/auth/login', {
      body: { email: 'ada@example.com', password: 'supersecret' },
    })

    const response = await browser.post('/api/v1/auth/logout')
    response.assertStatus(200)

    /**
     * The session is gone, so the protected route is closed again.
     */
    const profile = await browser.get('/api/v1/account/profile')
    profile.assertStatus(401)
  })
})

test.group('Email verification', () => {
  test('verifies the email with a valid link', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    const browser = new Browser(client)

    await browser.post('/api/v1/auth/signup', { body: signupPayload() })

    const [queued] = fakeMailer.mails.queued((message) => message instanceof VerifyEmail)
    assert.isDefined(queued)

    const response = await browser.get(pathOf((queued as VerifyEmail).link))

    response.assertStatus(302)
    assert.include(response.header('location'), '/verify-email?status=success')

    const user = await User.findBy('email', 'ada@example.com')
    assert.isNotNull(user!.emailVerifiedAt)
  })

  test('refuses a link that has expired', async ({ client, assert }) => {
    const user = await createUser()

    const browser = new Browser(client)
    const response = await browser.get(pathOf(expiredVerificationLink(user.id)))

    response.assertStatus(302)
    assert.include(response.header('location'), '/verify-email?status=expired')

    await user.refresh()
    assert.isNull(user.emailVerifiedAt)
  })

  test('sends the verification email again', async ({ client, assert }) => {
    await createUser()
    const fakeMailer = mail.fake()

    const browser = new Browser(client)
    await browser.post('/api/v1/auth/login', {
      body: { email: 'ada@example.com', password: 'supersecret' },
    })

    const response = await browser.post('/api/v1/auth/resend-verification')
    response.assertStatus(200)
    assert.isTrue(response.body().sent)

    fakeMailer.mails.assertQueued(VerifyEmail)
  })
})

test.group('Password reset', () => {
  test('answers the same way for an unknown email', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    const browser = new Browser(client)

    const response = await browser.post('/api/v1/auth/forgot-password', {
      body: { email: 'nobody@example.com' },
    })

    response.assertStatus(200)
    assert.isTrue(response.body().success)
    fakeMailer.mails.assertNoneQueued()
  })

  test('sends the reset link and accepts it only once', async ({ client, assert }) => {
    await createUser()
    const fakeMailer = mail.fake()

    const browser = new Browser(client)
    const response = await browser.post('/api/v1/auth/forgot-password', {
      body: { email: 'ada@example.com' },
    })

    response.assertStatus(200)

    const [queued] = fakeMailer.mails.queued((message) => message instanceof ResetPassword)
    assert.isDefined(queued)

    const token = tokenOf((queued as ResetPassword).link)

    const reset = await browser.post('/api/v1/auth/reset-password', {
      body: {
        token,
        password: 'anothersecret',
        passwordConfirmation: 'anothersecret',
      },
    })
    reset.assertStatus(200)

    /**
     * The new password works.
     */
    const login = await browser.post('/api/v1/auth/login', {
      body: { email: 'ada@example.com', password: 'anothersecret' },
    })
    login.assertStatus(200)

    /**
     * The link cannot be used a second time.
     */
    const reused = await browser.post('/api/v1/auth/reset-password', {
      body: {
        token,
        password: 'yetanothersecret',
        passwordConfirmation: 'yetanothersecret',
      },
    })
    reused.assertStatus(422)
    assert.equal(reused.body().code, 'E_INVALID_RESET_TOKEN')
  })

  test('ends the other sessions of the user', async ({ client }) => {
    await createUser()

    /**
     * Two browsers sign in with the same account.
     */
    const first = new Browser(client)
    await first.post('/api/v1/auth/login', {
      body: { email: 'ada@example.com', password: 'supersecret' },
    })

    const second = new Browser(client)
    await second.post('/api/v1/auth/login', {
      body: { email: 'ada@example.com', password: 'supersecret' },
    })

    const secondProfile = await second.get('/api/v1/account/profile')
    secondProfile.assertStatus(200)

    /**
     * The first browser asks for a reset link and uses it.
     */
    const fakeMailer = mail.fake()
    await first.post('/api/v1/auth/forgot-password', {
      body: { email: 'ada@example.com' },
    })

    const [queued] = fakeMailer.mails.queued((message) => message instanceof ResetPassword)
    const token = tokenOf((queued as ResetPassword).link)

    const reset = await first.post('/api/v1/auth/reset-password', {
      body: {
        token,
        password: 'anothersecret',
        passwordConfirmation: 'anothersecret',
      },
    })
    reset.assertStatus(200)

    /**
     * The session of the other browser is not valid anymore.
     */
    const profile = await second.get('/api/v1/account/profile')
    profile.assertStatus(401)
  })
})

test.group('Auth rate limiting', () => {
  test('blocks the login of an address after five failures', async ({ client, assert }) => {
    await createUser()

    const browser = new Browser(client)

    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await browser.post('/api/v1/auth/login', {
        body: { email: 'ada@example.com', password: 'wrong-password' },
      })
      response.assertStatus(401)
    }

    const blocked = await browser.post('/api/v1/auth/login', {
      body: { email: 'ada@example.com', password: 'supersecret' },
    })

    blocked.assertStatus(429)
    assert.isDefined(blocked.header('retry-after'))
  })
})
