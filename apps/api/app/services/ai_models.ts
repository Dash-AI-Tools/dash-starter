import type { AiAliasConfig, AiProviderName } from '#config/ai'
import env from '#start/env'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createGoogle } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { ImageModel, LanguageModel } from 'ai'
import { simulateReadableStream } from 'ai'
import { MockImageModelV4, MockLanguageModelV4 } from 'ai/test'

/**
 * The base URL of the providers that talk the OpenAI dialect.
 */
const COMPATIBLE_BASE_URLS: Record<'qwen' | 'kimi' | 'glm', string> = {
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  kimi: 'https://api.moonshot.cn/v1',
  glm: 'https://open.bigmodel.cn/api/paas/v4',
}

/**
 * The base URL of the local models.
 */
const OLLAMA_BASE_URL = 'http://localhost:11434/v1'

/**
 * The answer of the stub provider. It is the same every time, so a developer
 * can tell a stub answer from a real one.
 */
export const STUB_TEXT =
  'This answer comes from the stub provider. Configure a provider in the environment to get real replies.'

/**
 * The model of the alias, ready to be used by the AI SDK.
 */
export function languageModelOf(alias: AiAliasConfig): LanguageModel {
  if (alias.provider === 'stub') {
    return stubLanguageModel()
  }

  const provider = providerOf(alias.provider)
  return provider.languageModel(alias.modelId)
}

/**
 * The model that draws the images of the alias, ready to be used by the AI SDK.
 */
export function imageModelOf(alias: AiAliasConfig): ImageModel {
  if (alias.provider === 'stub') {
    return stubImageModel()
  }

  const provider = providerOf(alias.provider) as { imageModel: (modelId: string) => ImageModel }
  return provider.imageModel(alias.modelId)
}

/**
 * The provider of the registry, with its credentials.
 *
 * The keys never leave the server: they are read from the environment every
 * time a model is built.
 */
function providerOf(name: AiProviderName) {
  switch (name) {
    case 'anthropic':
      return createAnthropic({ apiKey: env.get('ANTHROPIC_API_KEY') })
    case 'openai':
      return createOpenAI({ apiKey: env.get('OPENAI_API_KEY') })
    case 'google':
      return createGoogle({ apiKey: env.get('GOOGLE_GENERATIVE_AI_API_KEY') })
    case 'deepseek':
      return createDeepSeek({ apiKey: env.get('DEEPSEEK_API_KEY') })
    case 'openrouter':
      return createOpenRouter({ apiKey: env.get('OPENROUTER_API_KEY') })
    case 'qwen':
      return createOpenAICompatible({
        name: 'qwen',
        baseURL: COMPATIBLE_BASE_URLS.qwen,
        apiKey: env.get('QWEN_API_KEY'),
      })
    case 'kimi':
      return createOpenAICompatible({
        name: 'kimi',
        baseURL: COMPATIBLE_BASE_URLS.kimi,
        apiKey: env.get('KIMI_API_KEY'),
      })
    case 'glm':
      return createOpenAICompatible({
        name: 'glm',
        baseURL: COMPATIBLE_BASE_URLS.glm,
        apiKey: env.get('GLM_API_KEY'),
      })
    case 'ollama':
      return createOpenAICompatible({
        name: 'ollama',
        baseURL: env.get('OLLAMA_BASE_URL') || OLLAMA_BASE_URL,
        apiKey: env.get('OLLAMA_API_KEY') || 'ollama',
      })
    case 'compatible':
      return createOpenAICompatible({
        name: 'compatible',
        baseURL: env.get('COMPATIBLE_BASE_URL') || '',
        apiKey: env.get('COMPATIBLE_API_KEY'),
      })
    default:
      throw new Error(`The AI provider "${name}" does not exist`)
  }
}

/**
 * The usage of a call to the stub: it does not use a single token.
 */
const STUB_USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
}

/**
 * The reason the stub stops: it always answers at once.
 */
const STUB_FINISH_REASON = { unified: 'stop' as const, raw: 'stop' }

/**
 * The model that answers with the canned text of the stub provider.
 */
function stubLanguageModel(): LanguageModel {
  return new MockLanguageModelV4({
    provider: 'stub',
    modelId: 'stub',
    doGenerate: async (options) => ({
      content: [{ type: 'text' as const, text: stubAnswer(options.responseFormat) }],
      finishReason: STUB_FINISH_REASON,
      usage: STUB_USAGE,
      warnings: [],
    }),
    doStream: async (options) => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'stream-start' as const, warnings: [] },
          { type: 'text-start' as const, id: 'stub' },
          { type: 'text-delta' as const, id: 'stub', delta: stubAnswer(options.responseFormat) },
          { type: 'text-end' as const, id: 'stub' },
          {
            type: 'finish' as const,
            finishReason: STUB_FINISH_REASON,
            usage: STUB_USAGE,
          },
        ],
      }),
    }),
  })
}

/**
 * The model that draws the placeholder image of the stub provider.
 */
function stubImageModel(): ImageModel {
  return new MockImageModelV4({
    provider: 'stub',
    modelId: 'stub',
    doGenerate: async () => ({
      images: [placeholderImage()],
      warnings: [],
      response: { timestamp: new Date(), modelId: 'stub', headers: undefined },
    }),
  })
}

/**
 * The answer of the stub provider. A call that asks for JSON gets an object
 * that matches the shape of the schema, so the structured generation can be
 * tried without a provider.
 */
function stubAnswer(
  responseFormat: { type: 'text' | 'json'; schema?: unknown } | undefined
): string {
  if (responseFormat?.type !== 'json') {
    return STUB_TEXT
  }

  return JSON.stringify(placeholderOf(responseFormat.schema))
}

/**
 * A placeholder value for a JSON schema, built out of the types the schema
 * declares.
 */
function placeholderOf(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') {
    return {}
  }

  const node = schema as { type?: string; properties?: Record<string, unknown> }

  if (node.type === 'array') {
    return []
  }

  if (node.type === 'number' || node.type === 'integer') {
    return 0
  }

  if (node.type === 'boolean') {
    return false
  }

  if (node.type === 'object' || node.properties) {
    const value: Record<string, unknown> = {}

    for (const [key, property] of Object.entries(node.properties ?? {})) {
      value[key] = placeholderOf(property)
    }

    return value
  }

  return 'stub'
}

/**
 * A one pixel PNG image, used as the placeholder of the stub provider.
 */
function placeholderImage(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ])
}
