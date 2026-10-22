import { test } from '@japa/runner'
import Membership from '#models/membership'
import type { Role } from '#models/membership'
import { createMember, createOrganization } from '#tests/helpers/ai'
import { toolRegistry } from '#tools/main'
import type { ToolContext } from '#tools/registry'

/**
 * An organization with a member that holds a role.
 */
async function scenario(role: Role = 'member') {
  const owner = await createMember('owner@example.com')
  const organization = await createOrganization(owner)

  const user = await createMember('member@example.com')
  const membership = await Membership.create({
    organizationId: organization.id,
    userId: user.id,
    role,
  })

  return { organization, membership, user }
}

/**
 * The context of a member that talks to a tool.
 */
function contextOf(context: Awaited<ReturnType<typeof scenario>>): ToolContext {
  return {
    organization: context.organization,
    membership: context.membership,
    user: context.user,
    locale: 'en',
  }
}

test.group('The registry of tools', () => {
  test('answers with the data of the organization', async ({ assert }) => {
    const context = await scenario()

    const outcome = await toolRegistry.call('organization_info', {}, contextOf(context))

    assert.equal(outcome.status, 'ok')

    if (outcome.status === 'ok') {
      assert.equal((outcome.data as { name: string }).name, 'Acme Labs')
    }
  })

  test('denies a tool that the role of the caller cannot use', async ({ assert }) => {
    const context = await scenario('member')

    const outcome = await toolRegistry.call('ai_usage_summary', {}, contextOf(context))

    assert.equal(outcome.status, 'denied')

    if (outcome.status === 'denied') {
      assert.equal(outcome.code, 'E_TOOL_FORBIDDEN')
      assert.notInclude(outcome.message, 'credits')
    }
  })

  test('lets an admin use the tool that needs the admin role', async ({ assert }) => {
    const context = await scenario('admin')

    const outcome = await toolRegistry.call('ai_usage_summary', {}, contextOf(context))

    assert.equal(outcome.status, 'ok')
  })

  test('denies a tool that the scopes of the caller do not cover', async ({ assert }) => {
    const context = await scenario()

    const outcome = await toolRegistry.call(
      'list_members',
      {},
      { ...contextOf(context), scopes: ['mcp:write'] }
    )

    assert.equal(outcome.status, 'denied')

    if (outcome.status === 'denied') {
      assert.equal(outcome.code, 'E_TOOL_SCOPE')
    }
  })

  test('denies a caller that has neither a membership nor scopes', async ({ assert }) => {
    const context = await scenario()

    const outcome = await toolRegistry.call(
      'organization_info',
      {},
      {
        organization: context.organization,
        user: context.user,
        locale: 'en',
      }
    )

    assert.equal(outcome.status, 'denied')

    if (outcome.status === 'denied') {
      assert.equal(outcome.code, 'E_TOOL_FORBIDDEN')
    }
  })

  test('denies a tool that does not exist', async ({ assert }) => {
    const context = await scenario()

    const outcome = await toolRegistry.call('drop_database', {}, contextOf(context))

    assert.equal(outcome.status, 'denied')

    if (outcome.status === 'denied') {
      assert.equal(outcome.code, 'E_TOOL_UNKNOWN')
    }
  })

  test('denies arguments that do not match the schema of the tool', async ({ assert }) => {
    const context = await scenario()

    const outcome = await toolRegistry.call('list_members', { role: 'wizard' }, contextOf(context))

    assert.equal(outcome.status, 'denied')

    if (outcome.status === 'denied') {
      assert.equal(outcome.code, 'E_TOOL_INPUT')
    }
  })
})
