import { test } from '@japa/runner'
import Invoice from '#models/invoice'
import Membership from '#models/membership'
import type { Role } from '#models/membership'
import Organization from '#models/organization'
import User from '#models/user'
import { seedCatalog } from '#tests/helpers/billing'
import { Browser } from '#tests/helpers/browser'
import env from '#start/env'
import type { ApiClient } from '@japa/api-client'
import { createHmac } from 'node:crypto'
import { DateTime } from 'luxon'

const SECRET = 'whsec_test_secret'

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
 * Adds an account to the organization with the given role.
 */
async function addMember(organization: Organization, email: string, role: Role) {
  const user = await createUser(email)

  await Membership.create({ organizationId: organization.id, userId: user.id, role })

  return user
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
 * The event of the payment provider, ready to travel.
 */
function event(id: string, eventType: string, organizationId: number) {
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
    } as Record<string, unknown>,
  }
}

/**
 * Sends the event to the webhook, signed the way the provider signs it.
 */
async function send(client: ApiClient, body: unknown) {
  const raw = JSON.stringify(body)

  const request = client.request('/api/v1/webhooks/creem', 'POST')
  request.unsafeJson(raw)
  request.header('creem-signature', createHmac('sha256', SECRET).update(raw).digest('hex'))

  return request
}

/**
 * An invoice of the organization, recorded at the given moment.
 */
async function createInvoice(
  organization: Organization,
  providerEventId: string,
  createdAt: DateTime,
  overrides: Partial<Pick<Invoice, 'plan' | 'amount' | 'currency' | 'state'>> = {}
) {
  return Invoice.create({
    organizationId: organization.id,
    plan: 'Pro',
    amount: 1900,
    currency: 'USD',
    state: 'paid',
    providerEventId,
    createdAt,
    ...overrides,
  })
}

test.group('The invoices recorded from the payment provider', (group) => {
  group.each.setup(() => {
    env.set('CREEM_WEBHOOK_SECRET', SECRET)
  })

  test('a subscription.paid event records a paid invoice', async ({ client, assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const response = await send(client, event('evt_paid', 'subscription.paid', organization.id))
    response.assertStatus(200)

    const invoices = await Invoice.query()
    assert.lengthOf(invoices, 1)

    const [invoice] = invoices
    assert.equal(invoice.organizationId, organization.id)
    assert.equal(invoice.plan, 'Pro')
    assert.strictEqual(invoice.amount, 1900)
    assert.equal(invoice.currency, 'USD')
    assert.equal(invoice.state, 'paid')
    assert.equal(invoice.providerEventId, 'evt_paid')
  })

  test('a subscription.past_due event records a failed invoice', async ({ client, assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const response = await send(
      client,
      event('evt_failed', 'subscription.past_due', organization.id)
    )
    response.assertStatus(200)

    const invoices = await Invoice.query()
    assert.lengthOf(invoices, 1)

    const [invoice] = invoices
    assert.equal(invoice.organizationId, organization.id)
    assert.equal(invoice.plan, 'Pro')
    assert.strictEqual(invoice.amount, 1900)
    assert.equal(invoice.currency, 'USD')
    assert.equal(invoice.state, 'failed')
    assert.equal(invoice.providerEventId, 'evt_failed')
  })

  test('a replayed event creates no second invoice', async ({ client, assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const body = event('evt_paid', 'subscription.paid', organization.id)

    const first = await send(client, body)
    first.assertStatus(200)
    const second = await send(client, body)
    second.assertStatus(200)

    const invoices = await Invoice.query().where('organizationId', organization.id)
    assert.lengthOf(invoices, 1)
    assert.equal(invoices[0].providerEventId, 'evt_paid')
  })

  test('checkout.completed records no invoice', async ({ client, assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const body = event('evt_checkout', 'checkout.completed', organization.id)
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

    assert.lengthOf(await Invoice.query(), 0)
  })
})

test.group('The invoice list of the organization', () => {
  test('an admin lists the invoices of the organization newest first', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await addMember(organization, 'grace@example.com', 'admin')

    const other = await createOrganization(await createUser('eve@example.com'), 'Other Corp')

    const now = DateTime.now()
    await createInvoice(organization, 'evt_old', now.minus({ months: 2 }))
    await createInvoice(organization, 'evt_new', now, { state: 'failed' })
    await createInvoice(organization, 'evt_mid', now.minus({ months: 1 }), {
      plan: 'Business',
      amount: 4900,
      currency: 'EUR',
    })
    await createInvoice(other, 'evt_other', now.plus({ minutes: 1 }))

    const browser = await signIn(client, 'grace@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/billing/invoices')

    response.assertStatus(200)

    const { invoices } = response.body()
    assert.lengthOf(invoices, 3)
    assert.deepEqual(
      invoices.map((invoice: { state: string; plan: string }) => [invoice.plan, invoice.state]),
      [
        ['Pro', 'failed'],
        ['Business', 'paid'],
        ['Pro', 'paid'],
      ]
    )
    assert.containsSubset(invoices[1], { plan: 'Business', amount: 4900, currency: 'EUR' })
    assert.properties(invoices[0], ['id', 'plan', 'amount', 'currency', 'state', 'createdAt'])
    assert.notProperty(invoices[0], 'providerEventId')

    const otherInvoice = await Invoice.findByOrFail('providerEventId', 'evt_other')
    assert.notInclude(
      invoices.map((invoice: { id: number }) => invoice.id),
      otherInvoice.id
    )
  })

  test('the owner lists the invoices of the organization newest first', async ({
    client,
    assert,
  }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const other = await createOrganization(await createUser('eve@example.com'), 'Other Corp')

    const now = DateTime.now()
    const older = await createInvoice(organization, 'evt_old', now.minus({ days: 30 }))
    const newer = await createInvoice(organization, 'evt_new', now)
    const foreign = await createInvoice(other, 'evt_other', now.plus({ minutes: 1 }))

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/billing/invoices')

    response.assertStatus(200)

    const ids = response.body().invoices.map((invoice: { id: number }) => invoice.id)
    assert.deepEqual(ids, [newer.id, older.id])
    assert.notInclude(ids, foreign.id)
  })

  test('a member cannot read the invoices', async ({ client, assert }) => {
    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await addMember(organization, 'ana@example.com', 'member')

    await createInvoice(organization, 'evt_paid', DateTime.now())

    const browser = await signIn(client, 'ana@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/billing/invoices')

    response.assertStatus(403)
    assert.notProperty(response.body(), 'invoices')
  })
})
