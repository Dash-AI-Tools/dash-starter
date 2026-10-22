import { test } from '@japa/runner'
import Membership from '#models/membership'
import { chatSystemPrompt, chatTools } from '#services/chat'
import { createMember, createOrganization } from '#tests/helpers/ai'
import type { ToolContext } from '#tools/registry'

/**
 * The context of a member of an organization, in the given language.
 */
async function contextOf(locale: 'en' | 'es'): Promise<ToolContext> {
  const user = await createMember()
  const organization = await createOrganization(user)

  return { organization, user, locale }
}

/**
 * The context of a plain member of an organization, who cannot see the
 * usage of the AI.
 */
async function contextOfMember(): Promise<ToolContext> {
  const owner = await createMember('owner@example.com')
  const organization = await createOrganization(owner)

  const user = await createMember('member@example.com')
  const membership = await Membership.create({
    organizationId: organization.id,
    userId: user.id,
    role: 'member',
  })

  return { organization, membership, user, locale: 'en' }
}

test.group('The instructions of the assistant', () => {
  test('asks for a Spanish answer when the member writes in Spanish', async ({ assert }) => {
    const prompt = chatSystemPrompt(await contextOf('es'))

    assert.include(prompt, 'Responde en español')
    assert.notInclude(prompt, 'Answer in')
  })

  test('asks for an English answer when the member writes in English', async ({ assert }) => {
    const prompt = chatSystemPrompt(await contextOf('en'))

    assert.include(prompt, 'Answer in English')
    assert.notInclude(prompt, 'Responde en')
  })
})

test.group('The tools of the chat', () => {
  test('answers the model with a permission error when a member asks for the billing data', async ({
    assert,
  }) => {
    const tools = chatTools(await contextOfMember())

    const result = await tools.ai_usage_summary.execute!(
      {},
      { toolCallId: 'call_1', messages: [], context: undefined }
    )

    assert.equal((result as { error: string }).error, 'E_TOOL_FORBIDDEN')
    assert.notInclude(JSON.stringify(result), 'credits')
  })
})
