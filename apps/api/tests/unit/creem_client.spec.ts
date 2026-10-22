import { test } from '@japa/runner'
import { CREEM_BASE_URLS, CreemApiError, CreemClient } from '#services/creem'

/**
 * A request the client sent, as it was recorded.
 */
type Recorded = {
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
}

/**
 * The requests the client sent during the test.
 */
let recorded: Recorded[] = []

/**
 * The answer the provider gives during the test.
 */
let answer: { status: number; body: string } = { status: 200, body: '{}' }

const originalFetch = globalThis.fetch

/**
 * Replaces the network of the process with a recorder, so the client can be
 * checked against the answers of the provider without calling it.
 */
function stubFetch() {
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    recorded.push({
      url: String(url),
      method: init.method as string,
      headers: init.headers as Record<string, string>,
      body: (init.body as string) ?? null,
    })

    return new Response(answer.body, {
      status: answer.status,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

/**
 * The client under test, talking to the sandbox.
 */
function client(environment: 'test' | 'live' = 'test') {
  return new CreemClient({ apiKey: 'secret-key', environment })
}

test.group('The client of the payment provider', (group) => {
  group.each.setup(() => {
    recorded = []
    answer = { status: 200, body: '{}' }
    stubFetch()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('talks to the sandbox outside production', ({ assert }) => {
    assert.equal(client('test').baseUrl, CREEM_BASE_URLS.test)
    assert.equal(client('test').baseUrl, 'https://test-api.creem.io')
  })

  test('talks to the live API in production', ({ assert }) => {
    assert.equal(client('live').baseUrl, CREEM_BASE_URLS.live)
    assert.equal(client('live').baseUrl, 'https://api.creem.io')
  })

  test('sends the key of the store in the header', async ({ assert }) => {
    await client().createCheckout({
      productId: 'prod_1',
      requestId: 'req_1',
      email: 'ada@example.com',
      successUrl: 'https://app.example.com/back',
      metadata: {},
    })

    assert.equal(recorded[0].headers['x-api-key'], 'secret-key')
  })

  test('creates a checkout with the product, the customer and the metadata', async ({ assert }) => {
    answer = {
      status: 200,
      body: JSON.stringify({ id: 'chk_1', checkout_url: 'https://pay.test/1' }),
    }

    const checkout = await client().createCheckout({
      productId: 'prod_1',
      requestId: 'req_1',
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      successUrl: 'https://app.example.com/back',
      metadata: { organizationId: '7' },
    })

    assert.equal(recorded[0].url, 'https://test-api.creem.io/v1/checkouts')
    assert.equal(recorded[0].method, 'POST')
    assert.deepEqual(JSON.parse(recorded[0].body!), {
      product_id: 'prod_1',
      request_id: 'req_1',
      customer: { email: 'ada@example.com', name: 'Ada Lovelace' },
      success_url: 'https://app.example.com/back',
      metadata: { organizationId: '7' },
    })

    assert.equal(checkout.id, 'chk_1')
    assert.equal(checkout.checkoutUrl, 'https://pay.test/1')
  })

  test('asks for the portal of a customer', async ({ assert }) => {
    answer = {
      status: 200,
      body: JSON.stringify({ customer_portal_link: 'https://portal.test/1' }),
    }

    const link = await client().createPortalLink('cus_1')

    assert.equal(recorded[0].url, 'https://test-api.creem.io/v1/customers/billing')
    assert.deepEqual(JSON.parse(recorded[0].body!), { customer_id: 'cus_1' })
    assert.equal(link, 'https://portal.test/1')
  })

  test('cancels a subscription right away or when the period ends', async ({ assert }) => {
    await client().cancelSubscription('sub_1', 'scheduled')

    assert.equal(recorded[0].url, 'https://test-api.creem.io/v1/subscriptions/sub_1/cancel')
    assert.deepEqual(JSON.parse(recorded[0].body!), { mode: 'scheduled' })
  })

  test('moves a subscription to another product', async ({ assert }) => {
    await client().changeSubscriptionProduct('sub_1', 'prod_2', 'proration-charge-immediately')

    assert.equal(recorded[0].url, 'https://test-api.creem.io/v1/subscriptions/sub_1/upgrade')
    assert.deepEqual(JSON.parse(recorded[0].body!), {
      product_id: 'prod_2',
      update_behavior: 'proration-charge-immediately',
    })
  })

  test('creates a recurring product', async ({ assert }) => {
    answer = {
      status: 200,
      body: JSON.stringify({ id: 'prod_9', price: 1900, currency: 'USD' }),
    }

    const product = await client().createProduct({
      name: 'Pro (monthly)',
      description: 'The Pro plan',
      price: 1900,
      currency: 'USD',
      billingPeriod: 'every-month',
    })

    assert.equal(recorded[0].url, 'https://test-api.creem.io/v1/products')
    assert.deepEqual(JSON.parse(recorded[0].body!), {
      name: 'Pro (monthly)',
      description: 'The Pro plan',
      price: 1900,
      currency: 'USD',
      billing_type: 'recurring',
      billing_period: 'every-month',
    })
    assert.equal(product.id, 'prod_9')
  })

  test('reads a product of the provider', async ({ assert }) => {
    answer = {
      status: 200,
      body: JSON.stringify({ id: 'prod_9', price: 1900, currency: 'USD' }),
    }

    const product = await client().getProduct('prod_9')

    assert.equal(recorded[0].url, 'https://test-api.creem.io/v1/products/prod_9')
    assert.equal(recorded[0].method, 'GET')
    assert.equal(product.price, 1900)
  })

  test('fails when the provider answers with an error', async ({ assert }) => {
    answer = { status: 422, body: JSON.stringify({ message: 'The product was not found' }) }

    try {
      await client().getProduct('prod_9')
      assert.fail('The client should have failed')
    } catch (error) {
      assert.instanceOf(error, CreemApiError)
      assert.equal((error as CreemApiError).status, 422)
      assert.deepEqual((error as CreemApiError).payload, { message: 'The product was not found' })
    }
  })
})
