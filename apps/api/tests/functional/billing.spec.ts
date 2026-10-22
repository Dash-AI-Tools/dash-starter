import { test } from '@japa/runner'
import Membership from '#models/membership'
import Organization from '#models/organization'
import Plan from '#models/plan'
import PlanPrice from '#models/plan_price'
import Subscription from '#models/subscription'
import type { SubscriptionStatus } from '#models/subscription'
import User from '#models/user'
import { syncProducts } from '#services/billing_sync'
import { EntitlementService } from '#services/entitlements'
import { seedPlans } from '#services/plans'
import { restoreCreem, seedCatalog, useFakeCreem } from '#tests/helpers/billing'
import { Browser } from '#tests/helpers/browser'
import type { ApiClient } from '@japa/api-client'
import db from '@adonisjs/lucid/services/db'
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
 * A subscription of the organization, in the given state.
 */
async function createSubscription(
  organization: Organization,
  status: SubscriptionStatus,
  options: { graceUntil?: DateTime | null; planKey?: string } = {}
) {
  const plan = await Plan.query()
    .where('key', options.planKey ?? 'pro')
    .firstOrFail()
  const price = await PlanPrice.query()
    .where('planId', plan.id)
    .where('interval', 'month')
    .firstOrFail()

  return Subscription.create({
    organizationId: organization.id,
    planPriceId: price.id,
    creemSubscriptionId: 'sub_1',
    creemCustomerId: 'cus_1',
    status,
    graceUntil: options.graceUntil ?? null,
  })
}

test.group('The catalog of plans', () => {
  test('lists the plans of the catalog for the pricing page', async ({ client, assert }) => {
    await seedCatalog()

    const browser = new Browser(client)
    const response = await browser.get('/api/v1/plans')

    response.assertStatus(200)

    const plans = response.body().plans
    assert.lengthOf(plans, 3)
    assert.equal(plans[0].key, 'free')
    assert.isTrue(plans[0].isDefaultFree)
    assert.equal(plans[0].entitlements.seats, 3)
    assert.lengthOf(plans[0].prices, 2)
    assert.equal(plans[2].key, 'business')
  })

  test('writes the plans in the language of the visitor', async ({ client, assert }) => {
    await seedCatalog()

    const browser = new Browser(client)
    const response = await browser.get('/api/v1/plans', {
      headers: { 'Accept-Language': 'es' },
    })

    response.assertStatus(200)
    assert.equal(response.body().plans[0].name, 'Gratis')
    assert.equal(response.body().plans[0].features[0], 'Hasta 3 puestos')
  })

  test('writes the catalog again without duplicating the plans', async ({ assert }) => {
    await seedCatalog()
    await seedPlans()

    assert.lengthOf(await Plan.query(), 3)
    assert.lengthOf(await PlanPrice.query().where('isActive', true), 6)
  })

  test('gives the paid prices the product of the provider', async ({ assert }) => {
    await seedPlans()

    const plan = await Plan.query().where('key', 'pro').firstOrFail()
    const price = await PlanPrice.query()
      .where('planId', plan.id)
      .where('interval', 'month')
      .where('isActive', true)
      .firstOrFail()

    assert.equal(price.creemProductId, 'prod_pro_month')

    /**
     * The free plan is not sold, so it has no product.
     */
    const free = await Plan.query().where('key', 'free').firstOrFail()
    const freePrice = await PlanPrice.query()
      .where('planId', free.id)
      .where('interval', 'month')
      .where('isActive', true)
      .firstOrFail()

    assert.isNull(freePrice.creemProductId)
  })

  test('keeps the product the owner configured', async ({ assert }) => {
    await seedPlans()

    const plan = await Plan.query().where('key', 'pro').firstOrFail()
    const price = await PlanPrice.query()
      .where('planId', plan.id)
      .where('interval', 'month')
      .where('isActive', true)
      .firstOrFail()

    price.creemProductId = 'prod_the_real_one'
    await price.save()

    await seedPlans()

    const updated = await PlanPrice.query().where('id', price.id).firstOrFail()
    assert.equal(updated.creemProductId, 'prod_the_real_one')
  })

  test('keeps the price of the subscribers when the price of the catalog changes', async ({
    assert,
  }) => {
    await seedCatalog()

    const plan = await Plan.query().where('key', 'pro').firstOrFail()
    const price = await PlanPrice.query()
      .where('planId', plan.id)
      .where('interval', 'month')
      .where('isActive', true)
      .firstOrFail()

    /**
     * The price of the catalog changed, so the seeder writes a new price and
     * leaves the old one alone: the subscribers keep what they signed up
     * with.
     */
    price.amountCents = 2500
    await price.save()

    await seedPlans()

    const prices = await PlanPrice.query()
      .where('planId', plan.id)
      .where('interval', 'month')
      .orderBy('id', 'asc')

    assert.lengthOf(prices, 2)

    const active = prices.find((entry) => entry.isActive)!
    assert.equal(active.amountCents, 1900)
    assert.notEqual(active.id, price.id)

    const old = prices.find((entry) => entry.id === price.id)!
    assert.equal(old.amountCents, 2500)
    assert.isFalse(old.isActive)
  })

  test('the database refuses two active prices for the same interval', async ({ assert }) => {
    await seedCatalog()

    const plan = await Plan.query().where('key', 'pro').firstOrFail()

    /**
     * The insert that fails runs in a nested transaction, so the rollback of
     * the savepoint leaves the transaction of the suite usable.
     */
    await assert.rejects(async () => {
      await db.transaction(async (trx) => {
        await PlanPrice.create(
          {
            planId: plan.id,
            interval: 'month',
            amountCents: 2900,
            currency: 'USD',
            isActive: true,
          },
          { client: trx }
        )
      })
    })
  })
})

test.group('The entitlements of the organization', () => {
  test('gives the free plan to an organization without a subscription', async ({ assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const plan = await EntitlementService.for(organization)
    const limits = await EntitlementService.limits(organization)

    assert.equal(plan.key, 'free')
    assert.equal(limits.seats, 3)
  })

  test('gives the plan of the subscription while it is active', async ({ assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await createSubscription(organization, 'active')

    const plan = await EntitlementService.for(organization)
    assert.equal(plan.key, 'pro')
  })

  test('gives the plan of the subscription while it is on trial', async ({ assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await createSubscription(organization, 'trialing')

    const plan = await EntitlementService.for(organization)
    assert.equal(plan.key, 'pro')
  })

  test('keeps the plan while the grace period of a failed payment lasts', async ({ assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await createSubscription(organization, 'past_due', {
      graceUntil: DateTime.now().plus({ days: 3 }),
    })

    const plan = await EntitlementService.for(organization)
    assert.equal(plan.key, 'pro')
  })

  test('gives the free plan again when the grace period is over', async ({ assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await createSubscription(organization, 'past_due', {
      graceUntil: DateTime.now().minus({ days: 1 }),
    })

    const plan = await EntitlementService.for(organization)
    assert.equal(plan.key, 'free')
  })

  test('gives the free plan when the subscription was canceled', async ({ assert }) => {
    await seedCatalog()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await createSubscription(organization, 'canceled')

    const plan = await EntitlementService.for(organization)
    assert.equal(plan.key, 'free')
  })
})

test.group('The checkout of a plan', (group) => {
  group.each.teardown(() => restoreCreem())

  test('answers with the URL of the payment provider', async ({ client, assert }) => {
    await seedCatalog()
    const creem = useFakeCreem()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/billing/checkout', {
      body: { plan: 'pro', interval: 'month' },
    })

    response.assertStatus(200)
    assert.equal(response.body().checkoutUrl, 'https://checkout.test/prod_pro_month')

    assert.lengthOf(creem.checkouts, 1)
    assert.equal(creem.checkouts[0].productId, 'prod_pro_month')
    assert.equal(creem.checkouts[0].email, 'ada@example.com')
    assert.equal(creem.checkouts[0].metadata.organizationId, String(organization.id))
  })

  test('refuses the checkout of a member', async ({ client }) => {
    await seedCatalog()
    useFakeCreem()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)

    const member = await createUser('ana@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'ana@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/billing/checkout', {
      body: { plan: 'pro', interval: 'month' },
    })

    response.assertStatus(403)
  })

  test('refuses the checkout when the email is not confirmed', async ({ client, assert }) => {
    await seedCatalog()
    useFakeCreem()

    const owner = await createUser('ada@example.com', false)
    await createOrganization(owner)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/billing/checkout', {
      body: { plan: 'pro', interval: 'month' },
    })

    response.assertStatus(403)
    assert.equal(response.body().code, 'E_EMAIL_NOT_VERIFIED')
  })

  test('refuses a second checkout while the organization pays for a plan', async ({
    client,
    assert,
  }) => {
    await seedCatalog()
    useFakeCreem()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await createSubscription(organization, 'active')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/billing/checkout', {
      body: { plan: 'business', interval: 'month' },
    })

    response.assertStatus(409)
    assert.equal(response.body().code, 'E_SUBSCRIPTION_EXISTS')
  })

  test('refuses a plan that does not exist', async ({ client, assert }) => {
    await seedCatalog()
    useFakeCreem()

    const owner = await createUser('ada@example.com')
    await createOrganization(owner)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/billing/checkout', {
      body: { plan: 'platinum', interval: 'month' },
    })

    response.assertStatus(422)
    assert.equal(response.body().code, 'E_PLAN_UNAVAILABLE')
  })
})

test.group('The billing of the organization', (group) => {
  group.each.teardown(() => restoreCreem())

  test('shows the plan, the subscription and the usage', async ({ client, assert }) => {
    await seedCatalog()
    useFakeCreem()

    const owner = await createUser('ada@example.com')
    await createOrganization(owner)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/billing')

    response.assertStatus(200)

    const billing = response.body().billing
    assert.equal(billing.plan.key, 'free')
    assert.isNull(billing.subscription)
    assert.equal(billing.usage.seats, 1)
  })

  test('moves the subscription to another plan', async ({ client, assert }) => {
    await seedCatalog()
    const creem = useFakeCreem()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await createSubscription(organization, 'active')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/billing/change-plan', {
      body: { plan: 'business', interval: 'year' },
    })

    response.assertStatus(200)
    assert.lengthOf(creem.changes, 1)
    assert.equal(creem.changes[0].id, 'sub_1')
    assert.equal(creem.changes[0].productId, 'prod_business_year')
    assert.equal(creem.changes[0].behavior, 'proration-charge-immediately')
  })

  test('refuses a downgrade that leaves members without a seat', async ({ client, assert }) => {
    await seedCatalog()
    const creem = useFakeCreem()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await createSubscription(organization, 'active', { planKey: 'business' })

    /**
     * The organization has eleven people and the Pro plan has ten seats.
     */
    for (const email of [
      'one@example.com',
      'two@example.com',
      'three@example.com',
      'four@example.com',
      'five@example.com',
      'six@example.com',
      'seven@example.com',
      'eight@example.com',
      'nine@example.com',
      'ten@example.com',
    ]) {
      const member = await createUser(email)
      await Membership.create({
        organizationId: organization.id,
        userId: member.id,
        role: 'member',
      })
    }

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/billing/change-plan', {
      body: { plan: 'pro', interval: 'month' },
    })

    response.assertStatus(422)
    assert.equal(response.body().code, 'E_VALIDATION_ERROR')

    const error = response.body().errors.find((entry: { field: string }) => entry.field === 'plan')
    assert.equal(error.code, 'downgrade_blocked')
    assert.include(error.message, 'Pro')
    assert.lengthOf(creem.changes, 0)
  })

  test('cancels the subscription when the period ends', async ({ client, assert }) => {
    await seedCatalog()
    const creem = useFakeCreem()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await createSubscription(organization, 'active')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/billing/cancel', { body: {} })

    response.assertStatus(200)
    assert.deepEqual(creem.cancellations, [{ id: 'sub_1', mode: 'scheduled' }])
  })

  test('cancels the subscription right away', async ({ client, assert }) => {
    await seedCatalog()
    const creem = useFakeCreem()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await createSubscription(organization, 'active')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.post('/api/v1/orgs/acme-labs/billing/cancel', {
      body: { mode: 'immediate' },
    })

    response.assertStatus(200)
    assert.deepEqual(creem.cancellations, [{ id: 'sub_1', mode: 'immediate' }])
  })

  test('answers with the link of the customer portal', async ({ client, assert }) => {
    await seedCatalog()
    const creem = useFakeCreem()

    const owner = await createUser('ada@example.com')
    const organization = await createOrganization(owner)
    await createSubscription(organization, 'active')

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/billing/portal')

    response.assertStatus(200)
    assert.equal(response.body().portalUrl, 'https://portal.test/cus_1')
    assert.deepEqual(creem.portals, ['cus_1'])
  })

  test('refuses the portal of an organization without a subscription', async ({
    client,
    assert,
  }) => {
    await seedCatalog()
    useFakeCreem()

    const owner = await createUser('ada@example.com')
    await createOrganization(owner)

    const browser = await signIn(client, 'ada@example.com')
    const response = await browser.get('/api/v1/orgs/acme-labs/billing/portal')

    response.assertStatus(404)
    assert.equal(response.body().code, 'E_NO_SUBSCRIPTION')
  })
})

test.group('The synchronization of the products of the provider', (group) => {
  group.each.teardown(() => restoreCreem())

  test('creates the products that the catalog needs', async ({ assert }) => {
    await seedCatalog()
    const creem = useFakeCreem()

    /**
     * The products of the paid prices are created by the command, so the
     * prices of the catalog start without one.
     */
    await PlanPrice.query().where('amountCents', '>', 0).update({ creemProductId: null })

    const report = await syncProducts(creem)

    assert.lengthOf(report.created, 4)
    assert.lengthOf(report.drift, 0)
    assert.equal(report.skipped, 2)

    assert.deepEqual(
      report.created.map((product) => `${product.planKey}_${product.interval}`).sort(),
      ['business_month', 'business_year', 'pro_month', 'pro_year']
    )

    const price = await PlanPrice.query().where('creemProductId', 'prod_1').firstOrFail()
    const plan = await Plan.query().where('id', price.planId).firstOrFail()
    assert.equal(plan.key, 'pro')
  })

  test('reports the prices that do not match the provider', async ({ assert }) => {
    await seedCatalog()
    const creem = useFakeCreem()

    creem.addProduct('prod_pro_month', 1900)
    creem.addProduct('prod_pro_year', 19000, 'every-year')
    creem.addProduct('prod_business_month', 4900)
    creem.addProduct('prod_business_year', 49000, 'every-year')

    /**
     * The provider charges more than the catalog says.
     */
    creem.addProduct('prod_pro_month', 2500)

    const report = await syncProducts(creem)

    assert.lengthOf(report.created, 0)
    assert.lengthOf(report.drift, 1)
    assert.equal(report.drift[0].planKey, 'pro')
    assert.equal(report.drift[0].interval, 'month')
    assert.equal(report.drift[0].expectedCents, 1900)
    assert.equal(report.drift[0].foundCents, 2500)
  })

  test('reports a price that the provider charges with another period', async ({ assert }) => {
    await seedCatalog()
    const creem = useFakeCreem()

    creem.addProduct('prod_pro_month', 1900)
    creem.addProduct('prod_pro_year', 19000, 'every-month')
    creem.addProduct('prod_business_month', 4900)
    creem.addProduct('prod_business_year', 49000, 'every-year')

    const report = await syncProducts(creem)

    assert.lengthOf(report.drift, 1)
    assert.equal(report.drift[0].interval, 'year')
    assert.equal(report.drift[0].foundPeriod, 'every-month')
  })

  test('creates again the product that the provider does not know', async ({ assert }) => {
    await seedCatalog()
    const creem = useFakeCreem()

    const report = await syncProducts(creem)

    assert.lengthOf(report.created, 4)
    assert.lengthOf(report.drift, 0)

    /**
     * The price points at the product that was created, instead of the one
     * the provider does not know.
     */
    const plan = await Plan.query().where('key', 'pro').firstOrFail()
    const price = await PlanPrice.query()
      .where('planId', plan.id)
      .where('interval', 'month')
      .firstOrFail()

    assert.equal(price.creemProductId, 'prod_1')
  })
})
