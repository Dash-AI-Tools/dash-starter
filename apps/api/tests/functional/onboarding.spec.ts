import { test } from '@japa/runner'
import OrganizationInvitation from '#mails/organization_invitation'
import Welcome from '#mails/welcome'
import Invitation from '#models/invitation'
import Membership from '#models/membership'
import Organization from '#models/organization'
import User from '#models/user'
import { Browser } from '#tests/helpers/browser'
import type { ApiClient } from '@japa/api-client'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

/**
 * Creates an account with a confirmed email address.
 */
async function createUser(email: string, verified = true) {
  return User.create({
    fullName: 'Test User',
    email,
    password: 'supersecret',
    locale: 'en',
    termsVersion: '2026-01-01',
    emailVerifiedAt: verified ? DateTime.now() : null,
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
 * An organization with an owner, as the first step of the setup leaves it.
 */
async function createOrganization(owner: User, name = 'Acme Labs') {
  const organization = await Organization.create({
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
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
 * Saves the use case, as the wizard does before the invitations.
 */
async function saveUseCase(browser: Browser) {
  const response = await browser.post('/api/v1/onboarding/use-case', {
    body: { teamSize: '2', useCase: 'content' },
  })

  response.assertStatus(200)
}

test.group('The setup of an organization', () => {
  test('starts at the details step when the user has no organization', async ({
    client,
    assert,
  }) => {
    await createUser('ada@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.get('/api/v1/onboarding')

    response.assertStatus(200)
    assert.equal(response.body().onboarding.step, 'details')
    assert.isNull(response.body().onboarding.organization)
  })

  test('resumes at the use case step when the organization is already created', async ({
    client,
    assert,
  }) => {
    const user = await createUser('ada@example.com')
    await createOrganization(user)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/onboarding')

    response.assertStatus(200)
    assert.equal(response.body().onboarding.step, 'use-case')
    assert.equal(response.body().onboarding.organization.slug, 'acme-labs')
  })

  test('saves the use case and moves to the invites step', async ({ client, assert }) => {
    const user = await createUser('ada@example.com')
    const organization = await createOrganization(user)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/onboarding/use-case', {
      body: { teamSize: '2', useCase: 'content' },
    })

    response.assertStatus(200)
    assert.equal(response.body().onboarding.step, 'invites')
    assert.equal(response.body().onboarding.teamSize, '2')
    assert.equal(response.body().onboarding.useCase, 'content')

    await organization.refresh()
    assert.equal(organization.onboardingState!.teamSize, '2')
    assert.equal(organization.onboardingState!.useCase, 'content')
  })

  test('refuses a use case that is not one of the offered ones', async ({ client, assert }) => {
    const user = await createUser('ada@example.com')
    await createOrganization(user)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/onboarding/use-case', {
      body: { teamSize: '42', useCase: 'content' },
    })

    response.assertStatus(422)
    assert.equal(response.body().code, 'E_VALIDATION_ERROR')
  })

  test('sends the invitations of the team and moves to the plan step', async ({
    client,
    assert,
  }) => {
    const fakeMailer = mail.fake()
    const user = await createUser('ada@example.com')
    const organization = await createOrganization(user)

    const browser = await signIn(client, 'ada@example.com')
    await saveUseCase(browser)

    const response = await browser.post('/api/v1/onboarding/invites', {
      body: { emails: ['ana@example.com', 'alan@example.com'] },
    })

    response.assertStatus(200)
    assert.equal(response.body().onboarding.step, 'plan')

    const invitations = await Invitation.query().where('organizationId', organization.id)
    assert.lengthOf(invitations, 2)
    fakeMailer.mails.assertQueued(OrganizationInvitation)
  })

  test('skips the invitations without sending anything', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    const user = await createUser('ada@example.com')
    const organization = await createOrganization(user)

    const browser = await signIn(client, 'ada@example.com')
    await saveUseCase(browser)

    const response = await browser.post('/api/v1/onboarding/invites', { body: {} })

    response.assertStatus(200)
    assert.equal(response.body().onboarding.step, 'plan')
    assert.lengthOf(await Invitation.query().where('organizationId', organization.id), 0)
    fakeMailer.mails.assertNotQueued(OrganizationInvitation)
  })

  test('refuses more invitations than the plan has seats for', async ({ client, assert }) => {
    const user = await createUser('ada@example.com')
    await createOrganization(user)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/onboarding/invites', {
      body: { emails: ['one@example.com', 'two@example.com', 'three@example.com'] },
    })

    response.assertStatus(402)
    assert.equal(response.body().code, 'E_SEAT_LIMIT_REACHED')
  })

  test('saves the plan and finishes the setup', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    const user = await createUser('ada@example.com')
    const organization = await createOrganization(user)

    const browser = await signIn(client, 'ada@example.com')
    await saveUseCase(browser)
    await browser.post('/api/v1/onboarding/invites', { body: {} })

    const plan = await browser.post('/api/v1/onboarding/plan', {
      body: { plan: 'free', interval: 'month' },
    })

    plan.assertStatus(200)
    assert.equal(plan.body().onboarding.step, 'complete')
    assert.deepEqual(plan.body().onboarding.plan, { key: 'free', interval: 'month' })

    const complete = await browser.post('/api/v1/onboarding/complete')

    complete.assertStatus(200)
    assert.equal(complete.body().onboarding.step, 'done')
    assert.equal(complete.body().onboarding.organization.slug, 'acme-labs')

    await organization.refresh()
    assert.isNotNull(organization.onboardedAt)
    fakeMailer.mails.assertQueued(Welcome)
  })

  test('does not show the setup again once the organization is ready', async ({
    client,
    assert,
  }) => {
    const user = await createUser('ada@example.com')
    const organization = await createOrganization(user)
    organization.onboardedAt = DateTime.now()
    await organization.save()

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/onboarding')

    response.assertStatus(200)
    assert.equal(response.body().onboarding.step, 'done')
  })

  test('refuses to save the progress when the setup has not started', async ({
    client,
    assert,
  }) => {
    await createUser('ada@example.com')
    const browser = await signIn(client, 'ada@example.com')

    const response = await browser.post('/api/v1/onboarding/use-case', {
      body: { teamSize: '2', useCase: 'content' },
    })

    response.assertStatus(422)
    assert.equal(response.body().code, 'E_ONBOARDING_NOT_STARTED')
  })
})

test.group('The pending invitations of the setup', () => {
  test('offers the invitations addressed to the email of the user', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    await createUser('ana@example.com')
    const browser = await signIn(client, 'ada@example.com')
    await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'member' },
    })

    const invitee = await signIn(client, 'ana@example.com')
    const response = await invitee.get('/api/v1/onboarding')

    response.assertStatus(200)
    assert.lengthOf(response.body().onboarding.invitations, 1)
    assert.equal(response.body().onboarding.invitations[0].organization.slug, organization.slug)
  })

  test('accepts a pending invitation without the token of the link', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    await createOrganization(owner)

    const browser = await signIn(client, 'ada@example.com')
    await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'admin' },
    })

    await createUser('ana@example.com')
    const invitee = await signIn(client, 'ana@example.com')
    const pending = await invitee.get('/api/v1/onboarding')
    const id = pending.body().onboarding.invitations[0].id

    const response = await invitee.post(`/api/v1/onboarding/invitations/${id}/accept`)

    response.assertStatus(200)
    assert.equal(response.body().membership.role, 'admin')
  })

  test('refuses an invitation that was sent to another email address', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('ada@example.com')
    await createOrganization(owner)

    const browser = await signIn(client, 'ada@example.com')
    const created = await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'member' },
    })

    await createUser('someone@example.com')
    const invitee = await signIn(client, 'someone@example.com')
    const response = await invitee.post(
      `/api/v1/onboarding/invitations/${created.body().invitation.id}/accept`
    )
    response.assertStatus(403)
    assert.equal(response.body().code, 'E_INVITATION_MISMATCH')
  })

  test('refuses an invitation when the email of the account is not confirmed', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('ada@example.com')
    await createOrganization(owner)

    const browser = await signIn(client, 'ada@example.com')
    const created = await browser.post('/api/v1/orgs/acme-labs/invitations', {
      body: { email: 'ana@example.com', role: 'member' },
    })

    await createUser('ana@example.com', false)
    const invitee = await signIn(client, 'ana@example.com')
    const response = await invitee.post(
      `/api/v1/onboarding/invitations/${created.body().invitation.id}/accept`
    )

    response.assertStatus(403)
    assert.equal(response.body().code, 'E_EMAIL_NOT_VERIFIED')
  })
})
