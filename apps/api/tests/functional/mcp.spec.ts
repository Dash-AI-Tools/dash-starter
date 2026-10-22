import { test } from '@japa/runner'
import AiUsageEvent from '#models/ai_usage_event'
import McpUsageEvent from '#models/mcp_usage_event'
import type Organization from '#models/organization'
import Plan from '#models/plan'
import PlanPrice from '#models/plan_price'
import Subscription from '#models/subscription'
import type User from '#models/user'
import { createApiKey, revokeApiKey } from '#services/api_keys'
import { createMember, createOrganization } from '#tests/helpers/ai'
import type { ApiClient } from '@japa/api-client'

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

/**
 * A key of the organization, with the scopes it holds.
 */
async function keyOf(organization: Organization, creator: User, scopes: string[]) {
  const { key, secret } = await createApiKey(organization, creator, { name: 'Agent', scopes })

  return { key, secret }
}

/**
 * Calls the MCP server with a JSON-RPC message.
 */
function mcp(client: ApiClient, secret: string, method: string, params?: Record<string, unknown>) {
  return client
    .request('/mcp', 'POST')
    .headers({
      authorization: `Bearer ${secret}`,
      accept: 'application/json, text/event-stream',
    })
    .json({ jsonrpc: '2.0', id: 1, method, params })
    .send()
}

test.group('The MCP server', () => {
  test('lists the tools of the product', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)
    const { secret } = await keyOf(organization, owner, ['mcp:read'])

    const response = await mcp(client, secret, 'tools/list')

    response.assertStatus(200)

    const tools = response.body().result.tools

    assert.lengthOf(tools, 4)
    assert.equal(tools[0].name, 'organization_info')
    assert.isString(tools[0].description)
    assert.equal(tools[0].inputSchema.type, 'object')
  })

  test('calls a tool with the data of the organization', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)
    const { secret } = await keyOf(organization, owner, ['mcp:read'])

    const response = await mcp(client, secret, 'tools/call', {
      name: 'organization_info',
      arguments: {},
    })

    response.assertStatus(200)

    const result = response.body().result
    const data = JSON.parse(result.content[0].text)

    assert.isNotTrue(result.isError)
    assert.equal(data.name, organization.name)
    assert.equal(data.plan, 'pro')
  })

  test('records the call of a tool', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)
    const { key, secret } = await keyOf(organization, owner, ['mcp:read'])

    await mcp(client, secret, 'tools/call', {
      name: 'organization_info',
      arguments: {},
    })

    const event = await McpUsageEvent.query().firstOrFail()

    assert.equal(event.organizationId, organization.id)
    assert.equal(event.apiKeyId, key.id)
    assert.equal(event.tool, 'organization_info')
    assert.equal(event.outcome, 'ok')
  })

  test('counts the tools that call the model as AI usage', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)
    const { secret } = await keyOf(organization, owner, ['mcp:write'])

    const response = await mcp(client, secret, 'tools/call', {
      name: 'generate_text',
      arguments: { prompt: 'A short text' },
    })

    response.assertStatus(200)

    const result = response.body().result

    assert.isNotTrue(result.isError)

    /**
     * The tool goes through the AI service, so the call is metered as the
     * usage of the model and counts against the credits of the organization.
     */
    const event = await AiUsageEvent.query().firstOrFail()

    assert.equal(event.organizationId, organization.id)
    assert.equal(event.feature, 'chat.tool')
  })

  test('refuses a tool the key has no scope for', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)
    const { secret } = await keyOf(organization, owner, ['mcp:read'])

    const response = await mcp(client, secret, 'tools/call', {
      name: 'generate_text',
      arguments: { prompt: 'A short text' },
    })

    response.assertStatus(200)

    const result = response.body().result

    assert.isTrue(result.isError)
    assert.include(result.content[0].text, 'E_TOOL_SCOPE')
    assert.equal(result._meta.code, 'E_TOOL_SCOPE')
  })

  test('refuses the calls over the allowance of the plan', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)
    const { key, secret } = await keyOf(organization, owner, ['mcp:read'])

    await McpUsageEvent.createMany(
      Array.from({ length: 1000 }, () => ({
        organizationId: organization.id,
        apiKeyId: key.id,
        tool: 'organization_info',
        outcome: 'ok' as const,
        durationMs: 1,
      }))
    )

    const response = await mcp(client, secret, 'tools/call', {
      name: 'organization_info',
      arguments: {},
    })

    response.assertStatus(200)

    const result = response.body().result

    assert.isTrue(result.isError)
    assert.include(result.content[0].text, 'mcp_quota_exceeded')
    assert.equal(result._meta.code, 'mcp_quota_exceeded')
  })

  test('answers 429 when the burst of the key is over the limit', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)
    const { secret } = await keyOf(organization, owner, ['mcp:read'])

    for (let index = 0; index < 30; index++) {
      const response = await mcp(client, secret, 'tools/list')
      response.assertStatus(200)
    }

    const limited = await mcp(client, secret, 'tools/list')

    limited.assertStatus(429)
    assert.equal(limited.body().code, 'E_TOO_MANY_REQUESTS')
    assert.isDefined(limited.header('retry-after'))
  })

  test('refuses a revoked key', async ({ client, assert }) => {
    const owner = await createMember('owner@example.com')
    const organization = await organizationWithMcp(owner)
    const { key, secret } = await keyOf(organization, owner, ['mcp:read'])

    await revokeApiKey(organization, key.id)

    const response = await mcp(client, secret, 'tools/list')

    response.assertStatus(401)
    assert.equal(response.body().code, 'E_INVALID_API_KEY')
  })

  test('refuses a key of an organization whose plan does not include the MCP', async ({
    client,
    assert,
  }) => {
    const owner = await createMember('owner@example.com')
    const organization = await createOrganization(owner)
    const { secret } = await keyOf(organization, owner, ['mcp:read'])

    const response = await mcp(client, secret, 'tools/list')

    response.assertStatus(403)
    assert.equal(response.body().code, 'E_MCP_NOT_ENABLED')
  })

  test('refuses a request without a key', async ({ client, assert }) => {
    const response = await client
      .request('/mcp', 'POST')
      .headers({ accept: 'application/json, text/event-stream' })
      .json({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
      .send()

    response.assertStatus(401)
    assert.equal(response.body().code, 'E_INVALID_API_KEY')
  })
})
