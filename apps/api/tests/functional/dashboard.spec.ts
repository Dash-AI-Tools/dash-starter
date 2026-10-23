import { test } from '@japa/runner'
import AiUsageEvent from '#models/ai_usage_event'
import Invitation from '#models/invitation'
import Membership from '#models/membership'
import type { Role } from '#models/membership'
import Organization from '#models/organization'
import Plan from '#models/plan'
import PlanPrice from '#models/plan_price'
import Subscription from '#models/subscription'
import User from '#models/user'
import { createApiKey } from '#services/api_keys'
import { Browser } from '#tests/helpers/browser'
import type { ApiClient } from '@japa/api-client'
import { DateTime } from 'luxon'

/**
 * Creates an account with a confirmed email address.
 */
async function createUser(email: string, fullName = 'Test User') {
  return User.create({
    fullName,
    email,
    password: 'supersecret',
    locale: 'en',
    termsVersion: '2026-01-01',
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
 * An organization with an owner, who joined it at the given moment.
 */
async function createOrganization(owner: User, name = 'Acme Labs', joinedAt = DateTime.now()) {
  const organization = await Organization.create({
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    defaultLocale: 'en',
  })

  await addMember(organization, owner, 'owner', joinedAt)

  return organization
}

/**
 * Makes a user a member of the organization.
 */
async function addMember(
  organization: Organization,
  user: User,
  role: Role = 'member',
  joinedAt = DateTime.now()
) {
  return Membership.create({
    organizationId: organization.id,
    userId: user.id,
    role,
    createdAt: joinedAt,
  })
}

/**
 * An invitation that is still waiting for an answer.
 */
async function invite(
  organization: Organization,
  inviter: User,
  email: string,
  sentAt = DateTime.now()
) {
  return Invitation.create({
    organizationId: organization.id,
    invitedById: inviter.id,
    email,
    role: 'member',
    tokenHash: `hash-${email}`,
    expiresAt: DateTime.now().plus({ days: 7 }),
    createdAt: sentAt,
  })
}

/**
 * A key of the organization, created by a member at the given moment.
 */
async function createKey(
  organization: Organization,
  creator: User,
  name: string,
  createdAt = DateTime.now()
) {
  const { key } = await createApiKey(organization, creator, { name, scopes: ['mcp:read'] })

  key.createdAt = createdAt
  await key.save()

  return key
}

/**
 * A call to the AI provider that cost the given credits.
 */
async function useCredits(
  organization: Organization,
  user: User,
  credits: number,
  at = DateTime.now()
) {
  return AiUsageEvent.create({
    organizationId: organization.id,
    userId: user.id,
    feature: 'tests',
    alias: 'chat',
    provider: 'stub',
    modelId: 'stub',
    outcome: 'success',
    credits,
    createdAt: at,
  })
}

/**
 * An active subscription of the organization to a plan of the catalog.
 */
async function subscribe(organization: Organization, planKey: string) {
  const plan = await Plan.query().where('key', planKey).firstOrFail()
  const price = await PlanPrice.query()
    .where('planId', plan.id)
    .where('interval', 'month')
    .where('isActive', true)
    .firstOrFail()

  return Subscription.create({
    organizationId: organization.id,
    planPriceId: price.id,
    creemSubscriptionId: 'sub_1',
    creemCustomerId: 'cus_1',
    status: 'active',
  })
}

test.group('The metrics of the dashboard', () => {
  test('returns the real counts and the limits of the plan', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com', 'Ada Lovelace')
    const organization = await createOrganization(owner)
    await subscribe(organization, 'pro')

    await addMember(organization, await createUser('grace@example.com'))
    await addMember(organization, await createUser('alan@example.com'))
    await invite(organization, owner, 'pending@example.com')

    await useCredits(organization, owner, 100)
    await useCredits(organization, owner, 20)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/dashboard')

    response.assertStatus(200)

    const dashboard = response.body().dashboard
    assert.equal(dashboard.members, 3)
    assert.deepEqual(dashboard.seats, { used: 4, limit: 10 })
    assert.deepEqual(dashboard.aiCredits, { used: 120, limit: 1000 })
    assert.deepEqual(dashboard.mcpCalls, { used: 0, limit: 1000, enabled: true })
  })

  test('returns an unlimited limit as -1', async ({ client, assert }) => {
    const free = await Plan.query().where('key', 'free').firstOrFail()
    free.entitlements = { ...free.entitlements, seats: -1, aiCredits: -1 }
    await free.save()

    const owner = await createUser('ada@example.com')
    await createOrganization(owner)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/dashboard')

    response.assertStatus(200)

    const dashboard = response.body().dashboard
    assert.deepEqual(dashboard.seats, { used: 1, limit: -1 })
    assert.deepEqual(dashboard.aiCredits, { used: 0, limit: -1 })
    assert.deepEqual(dashboard.mcpCalls, { used: 0, limit: 0, enabled: false })
  })

  test('returns the AI credits of the last 7 UTC days, with zero days and today last', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    await useCredits(organization, owner, 30)
    await useCredits(organization, owner, 12)

    /**
     * A call older than the week stays out of the chart, and so do the
     * credits of another organization.
     */
    await useCredits(organization, owner, 500, DateTime.utc().minus({ days: 8 }))

    const stranger = await createUser('stranger@example.com')
    const other = await createOrganization(stranger, 'Other Labs')
    await useCredits(other, stranger, 77)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/dashboard')

    response.assertStatus(200)

    const today = DateTime.utc().startOf('day')
    const expected = Array.from({ length: 7 }, (_, index) => ({
      date: today.minus({ days: 6 - index }).toISODate(),
      credits: index === 6 ? 42 : 0,
    }))

    assert.deepEqual(response.body().dashboard.usage, expected)
  })
})

test.group('The activity of the dashboard', () => {
  test('lists the activity newest first, with the owner as actor', async ({ client, assert }) => {
    const start = DateTime.utc().minus({ hours: 1 })

    const owner = await createUser('ada@example.com', 'Ada Lovelace')
    const organization = await createOrganization(owner, 'Acme Labs', start)
    await invite(organization, owner, 'grace@example.com', start.plus({ minutes: 1 }))
    await createKey(organization, owner, 'Deploy bot', start.plus({ minutes: 2 }))

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/dashboard')

    response.assertStatus(200)

    const actor = { fullName: 'Ada Lovelace', initials: 'AL' }
    assert.deepEqual(response.body().dashboard.activity, [
      { type: 'api_key_created', actor, at: start.plus({ minutes: 2 }).toISO() },
      { type: 'invitation_sent', actor, at: start.plus({ minutes: 1 }).toISO() },
      { type: 'member_joined', actor, at: start.toISO() },
    ])
  })

  test('leaves the emails, the invited address and the key name and prefix out', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('ada@example.com', 'Ada Lovelace')
    const organization = await createOrganization(owner)
    const member = await createUser('member@example.com', 'Grace Hopper')
    await addMember(organization, member)

    await invite(organization, owner, 'secret-invitee@example.com')
    const key = await createKey(organization, owner, 'Production deploy bot')

    const browser = await signIn(client, 'member@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/dashboard')

    response.assertStatus(200)

    const body = JSON.stringify(response.body())
    assert.include(body, 'invitation_sent')
    assert.include(body, 'api_key_created')

    for (const secret of [
      'ada@example.com',
      'member@example.com',
      'secret-invitee@example.com',
      'Production deploy bot',
      key.prefix!,
      'dash_',
      '@',
    ]) {
      assert.notInclude(body, secret)
    }
  })

  test('returns only the 10 newest entries when there are more', async ({ client, assert }) => {
    const start = DateTime.utc().minus({ hours: 1 })

    const owner = await createUser('ada@example.com', 'Ada Lovelace')
    const organization = await createOrganization(owner, 'Acme Labs', start)

    /**
     * Twelve more entries, alternating the three sources, one minute apart:
     * thirteen in total, so the three oldest are left out.
     */
    for (let index = 1; index <= 12; index++) {
      const at = start.plus({ minutes: index })

      if (index % 3 === 0) {
        await addMember(organization, await createUser(`member${index}@example.com`), 'member', at)
      } else if (index % 3 === 1) {
        await invite(organization, owner, `invitee${index}@example.com`, at)
      } else {
        await createKey(organization, owner, `Key ${index}`, at)
      }
    }

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/dashboard')

    response.assertStatus(200)

    const activity = response.body().dashboard.activity
    assert.lengthOf(activity, 10)
    assert.deepEqual(
      activity.map((entry: { at: string }) => entry.at),
      Array.from({ length: 10 }, (_, index) => start.plus({ minutes: 12 - index }).toISO())
    )
    assert.deepEqual(
      activity.map((entry: { type: string }) => entry.type),
      [
        'member_joined',
        'api_key_created',
        'invitation_sent',
        'member_joined',
        'api_key_created',
        'invitation_sent',
        'member_joined',
        'api_key_created',
        'invitation_sent',
        'member_joined',
      ]
    )
  })

  test('returns no actor for a key whose creator is gone', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com', 'Ada Lovelace')
    const organization = await createOrganization(owner)
    const admin = await createUser('admin@example.com', 'Alan Turing')
    await addMember(organization, admin, 'admin')

    await createKey(organization, admin, 'Deploy bot', DateTime.utc().plus({ minutes: 1 }))
    await admin.delete()

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/dashboard')

    response.assertStatus(200)

    const [newest] = response.body().dashboard.activity
    assert.equal(newest.type, 'api_key_created')
    assert.isNull(newest.actor)
  })
})

test.group('The access to the dashboard', () => {
  test('lets a member with the role member read it', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await addMember(organization, await createUser('member@example.com'), 'member')

    const browser = await signIn(client, 'member@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/dashboard')

    response.assertStatus(200)
    assert.equal(response.body().dashboard.members, 2)
  })

  test('refuses a user of another organization and returns no metric', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await useCredits(organization, owner, 120)

    const outsider = await createUser('outsider@example.com')
    await createOrganization(outsider, 'Other Labs')

    const browser = await signIn(client, 'outsider@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/dashboard')

    response.assertStatus(404)
    assert.notProperty(response.body(), 'dashboard')
    assert.notInclude(JSON.stringify(response.body()), '120')
  })
})
