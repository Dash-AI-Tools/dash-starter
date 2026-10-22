import { test } from '@japa/runner'
import AiUsageEvent from '#models/ai_usage_event'
import Conversation from '#models/conversation'
import Membership from '#models/membership'
import Message from '#models/message'
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
 * An organization with an owner and a second member.
 */
async function organizationWithTwoMembers() {
  const owner = await createMember('owner@example.com')
  const organization = await createOrganization(owner)

  const other = await createMember('other@example.com')
  await Membership.create({
    organizationId: organization.id,
    userId: other.id,
    role: 'member',
  })

  return { owner, other, organization }
}

test.group('The conversations of the member', () => {
  test('lists only the conversations of the member', async ({ client, assert }) => {
    const { owner, other, organization } = await organizationWithTwoMembers()

    const mine = await Conversation.create({
      organizationId: organization.id,
      userId: owner.id,
      title: 'Mine',
    })

    await Conversation.create({
      organizationId: organization.id,
      userId: other.id,
      title: 'Theirs',
    })

    const browser = await signIn(client, 'owner@example.com')
    const response = await browser.get(`/api/v1/orgs/${organization.slug}/chat/conversations`)

    response.assertStatus(200)

    const conversations = response.body().conversations

    assert.lengthOf(conversations, 1)
    assert.equal(conversations[0].id, mine.id)
    assert.equal(conversations[0].title, 'Mine')
  })

  test('hides the conversation of another member of the organization', async ({
    client,
    assert,
  }) => {
    const { other, organization } = await organizationWithTwoMembers()

    const theirs = await Conversation.create({
      organizationId: organization.id,
      userId: other.id,
      title: 'Theirs',
    })

    const browser = await signIn(client, 'owner@example.com')
    const response = await browser.get(
      `/api/v1/orgs/${organization.slug}/chat/conversations/${theirs.id}`
    )

    response.assertStatus(404)
    assert.equal(response.body().code, 'E_CONVERSATION_NOT_FOUND')
  })

  test('renames and deletes a conversation of the member', async ({ client, assert }) => {
    const { owner, organization } = await organizationWithTwoMembers()

    const conversation = await Conversation.create({
      organizationId: organization.id,
      userId: owner.id,
    })

    const browser = await signIn(client, 'owner@example.com')

    const renamed = await browser.patch(
      `/api/v1/orgs/${organization.slug}/chat/conversations/${conversation.id}`,
      { body: { title: 'A new name' } }
    )

    renamed.assertStatus(200)
    assert.equal(renamed.body().conversation.title, 'A new name')

    const deleted = await browser.delete(
      `/api/v1/orgs/${organization.slug}/chat/conversations/${conversation.id}`
    )

    deleted.assertStatus(200)
    assert.lengthOf(await Conversation.query(), 0)
  })
})

test.group('The chat of the member', () => {
  test('streams the answer of the assistant and keeps the conversation', async ({
    client,
    assert,
  }) => {
    const { owner, organization } = await organizationWithTwoMembers()

    const browser = await signIn(client, 'owner@example.com')
    const response = await browser.post(`/api/v1/orgs/${organization.slug}/chat`, {
      body: { message: 'Summarize our members by role' },
    })

    response.assertStatus(200)
    assert.include(response.text(), 'This answer comes from the stub provider')

    const conversation = await Conversation.query().firstOrFail()
    const messages = await Message.query().orderBy('id', 'asc')

    assert.equal(conversation.organizationId, organization.id)
    assert.equal(conversation.userId, owner.id)
    assert.isNotNull(conversation.title)

    assert.lengthOf(messages, 2)
    assert.equal(messages[0].role, 'user')
    assert.deepEqual(messages[0].parts, [{ type: 'text', text: 'Summarize our members by role' }])
    assert.equal(messages[1].role, 'assistant')
    assert.include(JSON.stringify(messages[1].parts), 'This answer comes from the stub provider')
  })

  test('keeps the messages of the conversation as the context of the next one', async ({
    client,
    assert,
  }) => {
    const { organization } = await organizationWithTwoMembers()

    const browser = await signIn(client, 'owner@example.com')

    await browser.post(`/api/v1/orgs/${organization.slug}/chat`, {
      body: { message: 'First question' },
    })

    const conversation = await Conversation.query().firstOrFail()

    const second = await browser.post(`/api/v1/orgs/${organization.slug}/chat`, {
      body: { conversationId: conversation.id, message: 'Second question' },
    })

    second.assertStatus(200)

    const messages = await Message.query().orderBy('id', 'asc')

    assert.lengthOf(messages, 4)
    assert.equal(messages[2].role, 'user')
    assert.deepEqual(messages[2].parts, [{ type: 'text', text: 'Second question' }])
  })

  test('refuses the message when the organization has no credits left', async ({
    client,
    assert,
  }) => {
    const { owner, organization } = await organizationWithTwoMembers()

    /**
     * The free plan gives 100 credits every month, so the organization has
     * used all of them.
     */
    await AiUsageEvent.create({
      organizationId: organization.id,
      userId: owner.id,
      feature: 'tests',
      alias: 'chat',
      provider: 'stub',
      modelId: 'stub',
      outcome: 'success',
      credits: 100,
    })

    const browser = await signIn(client, 'owner@example.com')
    const response = await browser.post(`/api/v1/orgs/${organization.slug}/chat`, {
      body: { message: 'Hello' },
    })

    response.assertStatus(402)
    assert.equal(response.body().code, 'E_AI_QUOTA_EXCEEDED')
  })

  test('limits how many messages a member can send', async ({ client }) => {
    const { organization } = await organizationWithTwoMembers()

    const browser = await signIn(client, 'owner@example.com')

    for (let index = 0; index < 20; index++) {
      const response = await browser.post(`/api/v1/orgs/${organization.slug}/chat`, {
        body: { message: `Question ${index}` },
      })

      response.assertStatus(200)
    }

    const refused = await browser.post(`/api/v1/orgs/${organization.slug}/chat`, {
      body: { message: 'One question too many' },
    })

    refused.assertStatus(429)
  })
})
