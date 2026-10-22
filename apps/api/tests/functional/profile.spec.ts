import { test } from '@japa/runner'
import EmailChange from '#mails/email_change'
import Membership from '#models/membership'
import Organization from '#models/organization'
import Plan from '#models/plan'
import PlanPrice from '#models/plan_price'
import Subscription from '#models/subscription'
import User from '#models/user'
import { slugify } from '#services/organizations'
import { Browser } from '#tests/helpers/browser'
import { TERMS_VERSION } from '#legal'
import type { ApiClient } from '@japa/api-client'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

/**
 * Creates an account with a confirmed email address.
 */
async function createUser(email: string) {
  return User.create({
    fullName: 'Ada Lovelace',
    email,
    password: 'supersecret',
    locale: 'en',
    termsVersion: TERMS_VERSION,
    emailVerifiedAt: DateTime.now(),
  })
}

/**
 * A browser with a signed-in session.
 */
async function signIn(client: ApiClient, email: string) {
  const browser = new Browser(client)
  const response = await browser.post('/api/v1/auth/login', {
    body: { email, password: 'supersecret' },
  })

  response.assertStatus(200)

  return browser
}

/**
 * An organization with an owner.
 */
async function createOrganization(owner: User, name = 'Acme Labs') {
  const organization = await Organization.create({
    name,
    slug: slugify(name),
    defaultLocale: 'en',
  })

  await Membership.create({
    organizationId: organization.id,
    userId: owner.id,
    role: 'owner',
  })

  return organization
}

/**
 * The path of a link of the API, so the test client can open it.
 */
function pathOf(url: string): string {
  const { pathname, search } = new URL(url)
  return `${pathname}${search}`
}

/**
 * A tiny PNG file, used as the avatar of the tests.
 */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

test.group('Profile', () => {
  test('updates the name and the preferences of the user', async ({ client, assert }) => {
    await createUser('ada@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.patch('/api/v1/account/profile', {
      body: { fullName: 'Ada L.', locale: 'es', theme: 'dark' },
    })

    response.assertStatus(200)
    assert.equal(response.body().user.fullName, 'Ada L.')
    assert.equal(response.body().user.locale, 'es')
    assert.equal(response.body().user.theme, 'dark')

    /**
     * The change is stored, so the next request of the browser is already
     * answered in the new language.
     */
    const user = await User.findBy('email', 'ada@example.com')
    assert.equal(user!.fullName, 'Ada L.')
    assert.equal(user!.locale, 'es')
    assert.equal(user!.theme, 'dark')
  })

  test('refuses a locale and a theme it does not know', async ({ client, assert }) => {
    await createUser('ada@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.patch('/api/v1/account/profile', {
      body: { locale: 'fr' },
    })

    response.assertStatus(422)
    const error = response
      .body()
      .errors.find((entry: { field: string }) => entry.field === 'locale')
    assert.equal(error.code, 'enum')
  })

  test('stores the avatar of the user in the disk', async ({ client, assert }) => {
    await createUser('ada@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.upload('/api/v1/account/profile/avatar', 'avatar', {
      contents: PNG,
      filename: 'avatar.png',
      contentType: 'image/png',
    })

    response.assertStatus(200)
    assert.include(response.body().user.avatarPath, '/api/uploads/avatars/')
    assert.include(response.body().user.avatarPath, '.png')
  })

  test('refuses an avatar that is not a PNG, a JPEG or a WebP', async ({ client, assert }) => {
    await createUser('ada@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.upload('/api/v1/account/profile/avatar', 'avatar', {
      contents: Buffer.from('GIF89a'),
      filename: 'avatar.gif',
      contentType: 'image/gif',
    })

    response.assertStatus(422)
    const error = response
      .body()
      .errors.find((entry: { field: string }) => entry.field === 'avatar')
    assert.equal(error.code, 'avatar_invalid_type')
  })

  test('refuses an avatar bigger than 2 MB', async ({ client, assert }) => {
    await createUser('ada@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.upload('/api/v1/account/profile/avatar', 'avatar', {
      contents: Buffer.alloc(2 * 1024 * 1024 + 1, 1),
      filename: 'avatar.png',
      contentType: 'image/png',
    })

    response.assertStatus(422)
    const error = response
      .body()
      .errors.find((entry: { field: string }) => entry.field === 'avatar')
    assert.equal(error.code, 'avatar_too_large')
  })
})

test.group('Email change', () => {
  test('keeps the old address active until the link is opened', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    await createUser('ada@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.post('/api/v1/account/profile/email', {
      body: { email: 'ada@new.example.com', currentPassword: 'supersecret' },
    })

    response.assertStatus(200)
    assert.isTrue(response.body().sent)

    /**
     * The old address is still the one of the account.
     */
    const user = await User.findBy('email', 'ada@example.com')
    assert.equal(user!.pendingEmail, 'ada@new.example.com')

    /**
     * The link is on its way to the new address.
     */
    fakeMailer.mails.assertQueued(EmailChange)
    const [queued] = fakeMailer.mails.queued((message) => message instanceof EmailChange)
    assert.include((queued as EmailChange).link, 'ada%40new.example.com')

    /**
     * Opening the link moves the account to the new address.
     */
    const confirm = await browser.get(pathOf((queued as EmailChange).link))
    confirm.assertStatus(302)
    assert.include(confirm.header('location'), '/verify-email?status=email-changed')

    const moved = await User.find(user!.id)
    assert.equal(moved!.email, 'ada@new.example.com')
    assert.isNull(moved!.pendingEmail)
  })

  test('refuses the change when the current password is not correct', async ({
    client,
    assert,
  }) => {
    const fakeMailer = mail.fake()
    await createUser('ada@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.post('/api/v1/account/profile/email', {
      body: { email: 'ada@new.example.com', currentPassword: 'wrong-password' },
    })

    response.assertStatus(422)
    const error = response
      .body()
      .errors.find((entry: { field: string }) => entry.field === 'currentPassword')
    assert.equal(error.code, 'current_password_invalid')

    fakeMailer.mails.assertNoneQueued()
  })

  test('refuses an address that already has an account', async ({ client, assert }) => {
    await createUser('ada@example.com')
    await createUser('other@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.post('/api/v1/account/profile/email', {
      body: { email: 'other@example.com', currentPassword: 'supersecret' },
    })

    response.assertStatus(422)
    const error = response.body().errors.find((entry: { field: string }) => entry.field === 'email')
    assert.equal(error.code, 'database.unique')
  })

  test('refuses a link that has expired', async ({ client, assert }) => {
    const user = await createUser('ada@example.com')
    user.pendingEmail = 'ada@new.example.com'
    await user.save()

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/auth/email-change/verify?user=1&email=x&expires=1')

    response.assertStatus(302)
    assert.include(response.header('location'), '/verify-email?status=expired')
  })
})

test.group('Password change', () => {
  test('changes the password and ends the other sessions', async ({ client }) => {
    await createUser('ada@example.com')

    const first = await signIn(client, 'ada@example.com')
    const second = await signIn(client, 'ada@example.com')

    const response = await first.post('/api/v1/account/profile/password', {
      body: {
        password: 'anothersecret',
        passwordConfirmation: 'anothersecret',
        currentPassword: 'supersecret',
      },
    })

    response.assertStatus(200)

    /**
     * The other session is closed, so a stolen one cannot be used.
     */
    const profile = await second.get('/api/v1/account/profile')
    profile.assertStatus(401)

    /**
     * The new password works.
     */
    const login = await new Browser(client).post('/api/v1/auth/login', {
      body: { email: 'ada@example.com', password: 'anothersecret' },
    })
    login.assertStatus(200)
  })

  test('refuses the change when the current password is not correct', async ({
    client,
    assert,
  }) => {
    await createUser('ada@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.post('/api/v1/account/profile/password', {
      body: {
        password: 'anothersecret',
        passwordConfirmation: 'anothersecret',
        currentPassword: 'wrong-password',
      },
    })

    response.assertStatus(422)
    const error = response
      .body()
      .errors.find((entry: { field: string }) => entry.field === 'currentPassword')
    assert.equal(error.code, 'current_password_invalid')
  })
})

test.group('Account deletion', () => {
  test('refuses the deletion while the user is the only owner of an organization with members', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const member = await createUser('member@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.delete('/api/v1/account/profile', {
      body: { password: 'supersecret' },
    })

    response.assertStatus(422)
    const error = response
      .body()
      .errors.find((entry: { field: string }) => entry.field === 'password')
    assert.equal(error.code, 'delete_blocked')

    assert.isNotNull(await User.find(owner.id))
  })

  test('refuses the deletion while the organization pays for a plan', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const plan = await Plan.query().where('key', 'pro').firstOrFail()
    const price = await PlanPrice.query()
      .where('planId', plan.id)
      .where('interval', 'month')
      .firstOrFail()

    await Subscription.create({
      organizationId: organization.id,
      planPriceId: price.id,
      creemSubscriptionId: 'sub_1',
      creemCustomerId: 'cus_1',
      status: 'active',
    })

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.delete('/api/v1/account/profile', {
      body: { password: 'supersecret' },
    })

    response.assertStatus(422)
    const error = response
      .body()
      .errors.find((entry: { field: string }) => entry.field === 'password')
    assert.equal(error.code, 'delete_blocked')

    assert.isNotNull(await User.find(owner.id))
  })

  test('deletes the account, the memberships and the sessions', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.delete('/api/v1/account/profile', {
      body: { password: 'supersecret' },
    })

    response.assertStatus(200)

    assert.isNull(await User.find(owner.id))
    assert.isNull(await Membership.query().where('userId', owner.id).first())

    /**
     * The session is gone, so the visitor is signed out.
     */
    const profile = await browser.get('/api/v1/account/profile')
    profile.assertStatus(401)

    /**
     * The organization is still there: it had no other members.
     */
    assert.isNotNull(await Organization.find(organization.id))
  })
})

test.group('Terms', () => {
  test('accepts the current version of the terms', async ({ client, assert }) => {
    const user = await createUser('ada@example.com')
    user.termsVersion = '2020-01-01'
    await user.save()

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/account/terms')

    response.assertStatus(200)
    assert.equal(response.body().user.termsVersion, TERMS_VERSION)

    await user.refresh()
    assert.equal(user.termsVersion, TERMS_VERSION)
    assert.isNotNull(user.termsAcceptedAt)
  })
})

test.group('Organizations of the visitor', () => {
  test('remembers the organization the user works in', async ({ client, assert }) => {
    const user = await createUser('ada@example.com')
    const organization = await createOrganization(user)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/account/organization', {
      body: { organizationId: organization.id },
    })

    response.assertStatus(200)
    assert.equal(response.body().user.lastOrganizationId, organization.id)

    await user.refresh()
    assert.equal(user.lastOrganizationId, organization.id)
  })

  test('refuses an organization the user does not belong to', async ({ client, assert }) => {
    await createUser('ada@example.com')
    const other = await createUser('other@example.com')
    const organization = await createOrganization(other, 'Other Labs')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/account/organization', {
      body: { organizationId: organization.id },
    })

    response.assertStatus(422)
    const error = response
      .body()
      .errors.find((entry: { field: string }) => entry.field === 'organizationId')
    assert.equal(error.code, 'organization_not_found')
  })
})

test.group('Member search', () => {
  test('narrows the members down to the ones that match', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const member = await createUser('grace@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'ada@example.com')

    const all = await browser.get('/api/v1/orgs/acme-labs/members')
    all.assertStatus(200)
    assert.lengthOf(all.body().members, 2)

    const found = await browser.get('/api/v1/orgs/acme-labs/members?search=grace')
    found.assertStatus(200)
    assert.lengthOf(found.body().members, 1)
    assert.equal(found.body().members[0].user.email, 'grace@example.com')
  })
})
