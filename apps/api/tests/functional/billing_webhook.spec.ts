import { test } from '@japa/runner'
import PaymentFailed from '#mails/payment_failed'
import SubscriptionCanceled from '#mails/subscription_canceled'
import SubscriptionStarted from '#mails/subscription_started'
import type { BaseMail } from '@adonisjs/mail'
import Membership from '#models/membership'
import Organization from '#models/organization'
import Plan from '#models/plan'
import PlanPrice from '#models/plan_price'
import Subscription from '#models/subscription'
import User from '#models/user'
import { EntitlementService } from '#services/entitlements'
import { seedCatalog } from '#tests/helpers/billing'
import env from '#start/env'
import type { ApiClient } from '@japa/api-client'
import mail from '@adonisjs/mail/services/main'
import { createHmac } from 'node:crypto'
import { DateTime } from 'luxon'

const SECRET = 'whsec_test_secret'

/**
 * The event of the payment provider, as it travels on the wire.
 */
type WebhookEvent = {
  id: string
  eventType: string
  created_at: number
  object: {
    id?: string
    product?: string
    customer?: string
    status?: string
    current_period_end_date?: string
    metadata?: Record<string, string>
    subscription?: Record<string, unknown>
    [key: string]: unknown
  }
}

/**
 * Creates an account with a confirmed email address.
 */
async function createUser(email: string) {
  return User.create({
    fullName: 'Test User',
    email,
    password: 'supersecret',
    locale: 'en',
    termsVersion: '2026-01-01',
    emailVerifiedAt: DateTime.now(),
  })
}

/**
 * An organization with an owner.
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
 * The event of the payment provider, ready to travel.
 */
function event(
  id: string,
  eventType: string,
  organizationId: number,
  overrides: Record<string, unknown> = {}
): WebhookEvent {
  return {
    id,
    eventType,
    created_at: Date.now(),
    object: {
      id: `sub_${id}`,
      product: 'prod_pro_month',
      customer: 'cus_1',
      status: 'active',
      current_period_end_date: '2026-12-31T00:00:00.000Z',
      metadata: { organizationId: String(organizationId) },
      ...overrides,
    },
  }
}

/**
 * Sends the event to the webhook, signed the way the provider signs it.
 */
async function send(client: ApiClient, body: unknown, signature?: string) {
  const raw = JSON.stringify(body)

  const request = client.request('/api/v1/webhooks/creem', 'POST')
  request.unsafeJson(raw)
  request.header(
    'creem-signature',
    signature ?? createHmac('sha256', SECRET).update(raw).digest('hex')
  )

  return request
}

/**
 * The address an email travels to.
 */
function recipientOf(message: BaseMail): string {
  const [to] = message.message.nodeMailerMessage.to ?? []
  return typeof to === 'string' ? to : (to?.address ?? '')
}

test.group('The webhooks of the payment provider', (group) => {
  group.each.setup(() => {
    env.set('CREEM_WEBHOOK_SECRET', SECRET)
  })

  group.each.teardown(() => {
    mail.restore()
  })

  test('refuses an event that is not signed', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const response = await send(
      client,
      event('evt_1', 'subscription.active', organization.id),
      'nope'
    )

    response.assertStatus(401)
    assert.equal(response.body().code, 'E_INVALID_WEBHOOK_SIGNATURE')
    assert.lengthOf(await Subscription.query(), 0)
  })

  test('refuses an event without a signature', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const request = client.request('/api/v1/webhooks/creem', 'POST')
    request.unsafeJson(JSON.stringify(event('evt_1', 'subscription.active', organization.id)))

    const response = await request

    response.assertStatus(401)
    assert.equal(response.body().code, 'E_INVALID_WEBHOOK_SIGNATURE')
  })

  test('activates the subscription of the organization', async ({ client, assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const response = await send(client, event('evt_1', 'subscription.active', organization.id))

    response.assertStatus(200)

    const subscription = await Subscription.query().firstOrFail()
    assert.equal(subscription.status, 'active')
    assert.equal(subscription.creemSubscriptionId, 'sub_evt_1')
    assert.equal(subscription.creemCustomerId, 'cus_1')
    assert.isNotNull(subscription.currentPeriodEnd)

    const plan = await Plan.query().where('key', 'pro').firstOrFail()
    const price = await PlanPrice.query()
      .where('planId', plan.id)
      .where('interval', 'month')
      .firstOrFail()

    assert.equal(subscription.planPriceId, price.id)

    const effective = await EntitlementService.for(organization)
    assert.equal(effective.key, 'pro')
  })

  test('activates the subscription when the checkout is completed', async ({ client, assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const body = event('evt_1', 'checkout.completed', organization.id)
    body.object.subscription = {
      id: 'sub_1',
      product: 'prod_pro_month',
      customer: 'cus_1',
      status: 'active',
      current_period_end_date: '2026-12-31T00:00:00.000Z',
      metadata: { organizationId: String(organization.id) },
    }

    const response = await send(client, body)

    response.assertStatus(200)

    const subscription = await Subscription.query().firstOrFail()
    assert.equal(subscription.status, 'active')
  })

  test('applies an event only once', async ({ client, assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const body = event('evt_1', 'subscription.active', organization.id)

    await send(client, body)
    const response = await send(client, body)

    response.assertStatus(200)
    assert.lengthOf(await Subscription.query(), 1)
  })

  test('ignores an event that is older than the last one', async ({ client, assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const newer = event('evt_2', 'subscription.past_due', organization.id)
    const older = event('evt_1', 'subscription.active', organization.id)
    older.created_at = newer.created_at - 60_000

    await send(client, newer)
    const response = await send(client, older)

    response.assertStatus(200)

    const subscription = await Subscription.query().firstOrFail()
    assert.equal(subscription.status, 'past_due')
  })

  test('ignores an event of an organization that does not exist', async ({ client, assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    await createOrganization(owner)

    const response = await send(client, event('evt_1', 'subscription.active', 999))

    response.assertStatus(200)
    assert.lengthOf(await Subscription.query(), 0)
  })

  test('keeps the access during the grace period of a failed payment', async ({
    client,
    assert,
  }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    await send(client, event('evt_1', 'subscription.active', organization.id))
    await send(client, event('evt_2', 'subscription.past_due', organization.id))

    const subscription = await Subscription.query().firstOrFail()
    assert.equal(subscription.status, 'past_due')
    assert.isNotNull(subscription.graceUntil)

    const plan = await EntitlementService.for(organization)
    assert.equal(plan.key, 'pro')
  })

  test('keeps the subscription alive until the period ends', async ({ client, assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    await send(client, event('evt_1', 'subscription.active', organization.id))
    await send(client, event('evt_2', 'subscription.scheduled_cancel', organization.id))

    const subscription = await Subscription.query().firstOrFail()
    assert.equal(subscription.status, 'active')
    assert.isTrue(subscription.cancelAtPeriodEnd)
  })

  test('closes the subscription when it is canceled', async ({ client, assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    await send(client, event('evt_1', 'subscription.active', organization.id))
    await send(client, event('evt_2', 'subscription.canceled', organization.id))

    const subscription = await Subscription.query().firstOrFail()
    assert.equal(subscription.status, 'canceled')

    const plan = await EntitlementService.for(organization)
    assert.equal(plan.key, 'free')
  })

  test('emails the owner when the subscription starts', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    await send(client, event('evt_1', 'subscription.active', organization.id))

    const queued = fakeMailer.mails.queued((message) => message instanceof SubscriptionStarted)
    assert.lengthOf(queued, 1)
    assert.equal(recipientOf(queued[0]), 'ada@example.com')
  })

  test('emails the owner when the payment fails', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    await send(client, event('evt_1', 'subscription.active', organization.id))
    await send(client, event('evt_2', 'subscription.past_due', organization.id))

    const queued = fakeMailer.mails.queued((message) => message instanceof PaymentFailed)
    assert.lengthOf(queued, 1)
  })

  test('emails the owner when the subscription is canceled', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    await send(client, event('evt_1', 'subscription.active', organization.id))
    await send(client, event('evt_2', 'subscription.canceled', organization.id))

    const queued = fakeMailer.mails.queued((message) => message instanceof SubscriptionCanceled)
    assert.lengthOf(queued, 1)
  })

  test('does not email the owner twice', async ({ client, assert }) => {
    const fakeMailer = mail.fake()
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const body = event('evt_1', 'subscription.active', organization.id)
    await send(client, body)
    await send(client, body)

    const queued = fakeMailer.mails.queued((message) => message instanceof SubscriptionStarted)
    assert.lengthOf(queued, 1)
  })
})
