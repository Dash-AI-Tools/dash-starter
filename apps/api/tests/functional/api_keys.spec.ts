import { test } from '@japa/runner'
import ApiKey from '#models/api_key'
import Membership from '#models/membership'
import Plan from '#models/plan'
import PlanPrice from '#models/plan_price'
import Subscription from '#models/subscription'
import type User from '#models/user'
import { createMember, createOrganization } from '#tests/helpers/ai'
import { Browser } from '#tests/helpers/browser'
import type { ApiClient } from '@japa/api-client'

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
 * An organization whose plan includes the MCP server.
 */
async function organizationWithMcp(owner: User) {
  const organization = await createOrganization(owner)

  const plan = await Plan.query().where('key', 'pro').firstOrFail()
  const price = await PlanPrice.query()
    .where('planId', plan.id)
    .where('interval', 'month')
    .firstOrFail()

  await Subscription.create({
    organizationId: organization.id,
    planPriceId: price.id,
    creemSubscriptionId: 'sub_mcp',
    creemCustomerId: 'cus_mcp',
    status: 'active',
  })

  return organization
}

test.group('The API keys of an organization', () => {
  test('shows the secret of a key only once', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)

    const browser = await signIn(client, 'owner@example.com')
    const created = await browser.post(`/api/v1/orgs/${organization.slug}/api-keys`, {
      body: { name: 'Claude Desktop', scopes: ['mcp:read'] },
    })

    created.assertStatus(200)

    const secret = created.body().secret
    assert.isString(secret)
    assert.include(secret, 'dash_')

    const listed = await browser.get(`/api/v1/orgs/${organization.slug}/api-keys`)

    listed.assertStatus(200)

    const keys = listed.body().apiKeys

    assert.lengthOf(keys, 1)
    assert.equal(keys[0].name, 'Claude Desktop')
    assert.deepEqual(keys[0].scopes, ['mcp:read'])
    assert.isUndefined(keys[0].secret)

    /**
     * The database only keeps the hash of the secret, so it cannot be read
     * back from it.
     */
    const stored = await ApiKey.query().firstOrFail()
    assert.notInclude(stored.hash, secret)
    assert.include(keys[0].prefix, 'dash_')
  })

  test('revokes a key and keeps the history of its calls', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)

    const browser = await signIn(client, 'owner@example.com')
    const created = await browser.post(`/api/v1/orgs/${organization.slug}/api-keys`, {
      body: { name: 'Agent', scopes: ['mcp:read'] },
    })

    created.assertStatus(200)

    const id = created.body().apiKey.id

    const revoked = await browser.delete(`/api/v1/orgs/${organization.slug}/api-keys/${id}`)

    revoked.assertStatus(200)

    const key = await ApiKey.query().firstOrFail()
    assert.isNotNull(key.revokedAt)
  })

  test('does not let the members of the organization manage the keys', async ({ client }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)

    const member = await createMember('member@example.com')
    await Membership.create({
      organizationId: organization.id,
      userId: member.id,
      role: 'member',
    })

    const browser = await signIn(client, 'member@example.com')

    const listed = await browser.get(`/api/v1/orgs/${organization.slug}/api-keys`)
    listed.assertStatus(403)

    const created = await browser.post(`/api/v1/orgs/${organization.slug}/api-keys`, {
      body: { name: 'Agent', scopes: ['mcp:read'] },
    })
    created.assertStatus(403)
  })

  test('refuses the organizations whose plan does not include the MCP server', async ({
    client,
    assert,
  }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)

    const browser = await signIn(client, 'owner@example.com')
    const created = await browser.post(`/api/v1/orgs/${organization.slug}/api-keys`, {
      body: { name: 'Agent', scopes: ['mcp:read'] },
    })

    created.assertStatus(403)
    assert.equal(created.body().code, 'E_MCP_NOT_ENABLED')
    assert.lengthOf(await ApiKey.query(), 0)
  })

  test('does not let one organization revoke the key of another one', async ({
    client,
    assert,
  }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)

    const browser = await signIn(client, 'owner@example.com')
    const created = await browser.post(`/api/v1/orgs/${organization.slug}/api-keys`, {
      body: { name: 'Agent', scopes: ['mcp:read'] },
    })

    const id = created.body().apiKey.id

    const other = await createMember('other@example.com')
    const otherOrganization = await organizationWithMcp(other)

    const otherBrowser = await signIn(client, 'other@example.com')
    const revoked = await otherBrowser.delete(
      `/api/v1/orgs/${otherOrganization.slug}/api-keys/${id}`
    )

    revoked.assertStatus(404)
    assert.equal(revoked.body().code, 'E_API_KEY_NOT_FOUND')
  })
})
