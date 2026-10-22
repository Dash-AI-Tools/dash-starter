import { test } from '@japa/runner'
import { buildAiRegistry } from '#config/ai'
import AiUsageEvent from '#models/ai_usage_event'
import type Organization from '#models/organization'
import type User from '#models/user'
import { AiService } from '#services/ai'
import {
  createMember,
  createOrganization,
  failingModel,
  mockImageModel,
  mockModel,
  stubRegistry,
} from '#tests/helpers/ai'
import mail from '@adonisjs/mail/services/main'
import { z } from 'zod'

/**
 * An organization with an owner, and the request a feature would make.
 */
async function scenario() {
  const user = await createMember()
  const organization = await createOrganization(user)

  return {
    user,
    organization,
    context: { organization, user, feature: 'tests', alias: 'chat' as const },
  }
}

/**
 * The service of the tests, with the model the test wants.
 */
function serviceWith(model: ReturnType<typeof mockModel>) {
  return new AiService(stubRegistry(), {
    languageModel: () => model,
    imageModel: () => mockImageModel(),
  })
}

/**
 * Writes a usage event of the organization, as a call of the past would.
 */
async function usedCredits(organization: Organization, user: User, credits: number) {
  return AiUsageEvent.create({
    organizationId: organization.id,
    userId: user.id,
    feature: 'tests',
    alias: 'chat',
    provider: 'stub',
    modelId: 'stub',
    outcome: 'success',
    credits,
  })
}

test.group('The service of the AI models', () => {
  test('answers with the text of the model and records what the call cost', async ({ assert }) => {
    const { organization, user, context } = await scenario()
    const service = serviceWith(mockModel({ input: 1200, output: 300 }))

    const result = await service.generateText(context, { prompt: 'Hello' })

    assert.equal(result.text, 'The answer of the mock')
    assert.equal(result.usage.inputTokens, 1200)
    assert.equal(result.usage.outputTokens, 300)
    assert.equal(result.credits, 2.1)

    const event = await AiUsageEvent.query().firstOrFail()

    assert.equal(event.organizationId, organization.id)
    assert.equal(event.userId, user.id)
    assert.equal(event.feature, 'tests')
    assert.equal(event.alias, 'chat')
    assert.equal(event.provider, 'stub')
    assert.equal(event.inputTokens, 1200)
    assert.equal(event.outputTokens, 300)
    assert.equal(event.credits, 2.1)
    assert.equal(event.outcome, 'success')
  })

  test('hides the failure of the provider and records it as an error', async ({ assert }) => {
    const { context } = await scenario()
    const service = serviceWith(failingModel())

    try {
      await service.generateText(context, { prompt: 'Hello' })
      assert.fail('the call should have failed')
    } catch (error) {
      const failure = error as { code: string; status: number; message: string }

      assert.equal(failure.code, 'E_AI_UNAVAILABLE')
      assert.equal(failure.status, 503)
      assert.notInclude(failure.message, 'The provider is down')
    }

    const event = await AiUsageEvent.query().firstOrFail()

    assert.equal(event.outcome, 'error')
    assert.equal(event.credits, 0)
    assert.equal(event.errorMessage, 'The provider is down')
  })

  test('refuses the call when the organization has no credits left', async ({ assert }) => {
    const { organization, user, context } = await scenario()
    const model = mockModel({ input: 100, output: 0 })
    const service = serviceWith(model)

    /**
     * The free plan gives 100 credits every month, so the organization has
     * used all of them.
     */
    await usedCredits(organization, user, 100)

    try {
      await service.generateText(context, { prompt: 'Hello' })
      assert.fail('the call should have been refused')
    } catch (error) {
      const refusal = error as { code: string; status: number }

      assert.equal(refusal.code, 'E_AI_QUOTA_EXCEEDED')
      assert.equal(refusal.status, 402)
    }

    assert.lengthOf(model.doGenerateCalls, 0)
    assert.lengthOf(await AiUsageEvent.query(), 1)
  })

  test('refuses an alias whose model cannot do what the feature needs', async ({ assert }) => {
    const { context } = await scenario()
    const registry = buildAiRegistry({
      nodeEnv: 'test',
      provider: 'anthropic',
      aliases: {},
      keys: { anthropic: 'the-key' },
    })
    const service = new AiService(registry, {
      languageModel: () => mockModel(),
      imageModel: () => mockImageModel(),
    })

    try {
      await service.generateImage({ ...context, alias: 'image' }, { prompt: 'A cat' })
      assert.fail('the call should have been refused')
    } catch (error) {
      const refusal = error as { code: string; message: string }

      assert.equal(refusal.code, 'E_AI_ALIAS_UNAVAILABLE')
      assert.include(refusal.message, 'image')
    }
  })

  test('answers with an object that matches the schema', async ({ assert }) => {
    const { context } = await scenario()
    const service = new AiService(stubRegistry())

    const result = await service.generateObject(context, {
      prompt: 'Give me a report',
      schema: z.object({ title: z.string(), pages: z.number() }),
    })

    assert.isObject(result.object)
    assert.property(result.object, 'title')
    assert.property(result.object, 'pages')
  })
})

test.group('The quota of the organization', () => {
  test('warns the administrators at 80% and only once', async ({ assert }) => {
    const fakeMailer = mail.fake()
    const { organization, user, context } = await scenario()
    const service = serviceWith(mockModel({ input: 1000, output: 0 }))

    await usedCredits(organization, user, 79)

    await service.generateText(context, { prompt: 'Hello' })

    const queued = fakeMailer.mails.queued()

    assert.lengthOf(queued, 1)
    assert.include(queued[0].subject, '80%')

    /**
     * The usage only grows, so the threshold is crossed once per period.
     */
    await service.generateText(context, { prompt: 'Hello again' })

    assert.lengthOf(fakeMailer.mails.queued(), 1)
  })

  test('warns the administrators when the quota is exhausted', async ({ assert }) => {
    const fakeMailer = mail.fake()
    const { organization, user, context } = await scenario()
    const service = serviceWith(mockModel({ input: 1000, output: 0 }))

    await usedCredits(organization, user, 99)

    await service.generateText(context, { prompt: 'Hello' })

    const queued = fakeMailer.mails.queued()

    assert.lengthOf(queued, 1)
    assert.include(queued[0].subject, 'all your AI credits')
  })
})
