import { test } from '@japa/runner'
import { buildAiRegistry } from '#config/ai'
import { languageModelOf } from '#services/ai_models'
import env from '#start/env'
import { generateText } from 'ai'

test.group('The registry of the AI models', () => {
  test('points every alias at the provider and the model of the environment', ({ assert }) => {
    const registry = buildAiRegistry({
      nodeEnv: 'development',
      provider: 'openai',
      aliases: { chat: { model: 'gpt-4.1' } },
      keys: { openai: 'the-key' },
    })

    assert.equal(registry.provider, 'openai')
    assert.equal(registry.aliases.chat.provider, 'openai')
    assert.equal(registry.aliases.chat.modelId, 'gpt-4.1')
    assert.equal(registry.aliases.fast.modelId, 'gpt-4.1-mini')
    assert.equal(registry.aliases.reasoning.modelId, 'o4-mini')
  })

  test('lets an alias run on another provider', ({ assert }) => {
    const registry = buildAiRegistry({
      nodeEnv: 'development',
      provider: 'openai',
      aliases: { image: { provider: 'deepseek', model: 'deepseek-chat' } },
      keys: { openai: 'the-key', deepseek: 'another-key' },
    })

    assert.equal(registry.aliases.image.provider, 'deepseek')
    assert.equal(registry.aliases.image.modelId, 'deepseek-chat')
    assert.equal(registry.aliases.chat.provider, 'openai')
  })

  test('refuses a provider that does not exist', ({ assert }) => {
    assert.throws(
      () =>
        buildAiRegistry({
          nodeEnv: 'development',
          provider: 'not-a-provider',
          aliases: {},
          keys: {},
        }),
      'The AI provider "not-a-provider" of the alias "chat" does not exist'
    )
  })

  test('takes away the capabilities the provider cannot do', ({ assert }) => {
    const registry = buildAiRegistry({
      nodeEnv: 'development',
      provider: 'anthropic',
      aliases: {},
      keys: { anthropic: 'the-key' },
    })

    assert.deepEqual(registry.aliases.image.capabilities, [])
    assert.include(registry.aliases.chat.capabilities, 'text')
    assert.include(registry.aliases.chat.capabilities, 'stream')
  })

  test('uses the stub when the provider has no key', ({ assert }) => {
    const registry = buildAiRegistry({
      nodeEnv: 'development',
      provider: 'openai',
      aliases: {},
      keys: {},
    })

    assert.equal(registry.aliases.chat.provider, 'stub')
    assert.equal(registry.aliases.chat.modelId, 'stub')
  })

  test('refuses to work without a key in production', ({ assert }) => {
    assert.throws(
      () =>
        buildAiRegistry({
          nodeEnv: 'production',
          provider: 'openai',
          aliases: {},
          keys: {},
        }),
      'The AI provider "openai" has no API key'
    )
  })

  test('refuses the stub in production', ({ assert }) => {
    assert.throws(
      () =>
        buildAiRegistry({
          nodeEnv: 'production',
          provider: 'stub',
          aliases: {},
          keys: {},
        }),
      'The AI provider has to be configured in production'
    )
  })
})

test.group('The models of the registry', () => {
  test('maps any alias to a custom OpenAI-compatible endpoint', async ({ assert }) => {
    const registry = buildAiRegistry({
      nodeEnv: 'development',
      provider: 'compatible',
      aliases: { reasoning: { provider: 'compatible', model: 'my-own-model' } },
      keys: { compatible: 'the-key' },
    })

    assert.equal(registry.aliases.reasoning.provider, 'compatible')
    assert.equal(registry.aliases.reasoning.modelId, 'my-own-model')

    const model = languageModelOf(registry.aliases.reasoning)

    /**
     * The model of the alias carries its id. A model can also be the id of a
     * model of the registry of the provider, so both shapes are covered.
     */
    assert.equal(typeof model === 'string' ? model : model.modelId, 'my-own-model')

    /**
     * The call goes to the base URL of the environment, and not to a vendor.
     */
    const baseUrl = env.get('COMPATIBLE_BASE_URL')

    if (!baseUrl) {
      throw new Error('the environment does not point the compatible provider anywhere')
    }

    try {
      await generateText({ model, prompt: 'Hello', maxRetries: 0 })
      assert.fail('the call should have failed')
    } catch (error) {
      assert.include((error as { url: string }).url, baseUrl)
    }
  })
})
