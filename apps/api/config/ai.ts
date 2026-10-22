import env from '#start/env'

/**
 * The providers the registry knows about.
 *
 * Qwen, Kimi, GLM and Ollama talk the OpenAI dialect, so they are served by
 * the compatible provider with their own base URL.
 */
export const AI_PROVIDERS = [
  'stub',
  'anthropic',
  'openai',
  'google',
  'deepseek',
  'openrouter',
  'qwen',
  'kimi',
  'glm',
  'ollama',
  'compatible',
] as const

export type AiProviderName = (typeof AI_PROVIDERS)[number]

/**
 * The purposes a feature can ask a model for. A feature never names a vendor
 * model, it names the purpose and the registry points it at a model.
 */
export const AI_ALIASES = ['chat', 'fast', 'reasoning', 'image'] as const

export type AiAlias = (typeof AI_ALIASES)[number]

/**
 * What a model is able to do.
 */
export const AI_CAPABILITIES = ['text', 'stream', 'object', 'image'] as const

export type AiCapability = (typeof AI_CAPABILITIES)[number]

/**
 * The credits a call costs.
 *
 * The prices are placeholders: the product owner replaces them with the ones
 * of the models the aliases point at.
 */
export type AiPricing = {
  /** Credits per thousand input tokens. */
  input: number
  /** Credits per thousand output tokens. */
  output: number
  /** Credits per generated image. */
  image: number
}

/**
 * One alias of the registry: the model it points at, what that model can do
 * and what a call to it costs.
 */
export type AiAliasConfig = {
  /** The name of the alias. */
  alias: AiAlias
  /** The provider that serves the alias. */
  provider: AiProviderName
  /** The identifier of the model inside the provider. */
  modelId: string
  /** What the model behind the alias is able to do. */
  capabilities: AiCapability[]
  /** The credits a call to the alias costs. */
  pricing: AiPricing
}

/**
 * The registry of the AI models of the application.
 */
export type AiRegistry = {
  /** The provider every alias uses when it does not name one. */
  provider: AiProviderName
  /** How long a call to the provider may take. */
  timeoutMs: number
  /** The aliases, one per purpose. */
  aliases: Record<AiAlias, AiAliasConfig>
}

/**
 * How long a call to the provider may take when the environment does not say.
 */
export const AI_DEFAULT_TIMEOUT_MS = 60_000

/**
 * What every provider is able to do.
 *
 * The list follows the providers of the AI SDK: the ones that cannot draw
 * images have no image model at all, so an alias that points at them cannot
 * be used to draw.
 */
const PROVIDER_CAPABILITIES: Record<AiProviderName, AiCapability[]> = {
  stub: ['text', 'stream', 'object', 'image'],
  anthropic: ['text', 'stream', 'object'],
  openai: ['text', 'stream', 'object', 'image'],
  google: ['text', 'stream', 'object'],
  deepseek: ['text', 'stream', 'object'],
  openrouter: ['text', 'stream', 'object', 'image'],
  qwen: ['text', 'stream', 'object', 'image'],
  kimi: ['text', 'stream', 'object', 'image'],
  glm: ['text', 'stream', 'object', 'image'],
  ollama: ['text', 'stream', 'object', 'image'],
  compatible: ['text', 'stream', 'object', 'image'],
}

/**
 * What every alias is for. The alias is the promise the feature gets, so an
 * alias never offers more than its purpose.
 */
const ALIAS_CAPABILITIES: Record<AiAlias, AiCapability[]> = {
  chat: ['text', 'stream', 'object'],
  fast: ['text', 'stream', 'object'],
  reasoning: ['text', 'stream', 'object'],
  image: ['image'],
}

/**
 * The credits every alias costs.
 */
const ALIAS_PRICING: Record<AiAlias, AiPricing> = {
  chat: { input: 1, output: 3, image: 0 },
  fast: { input: 0.25, output: 0.75, image: 0 },
  reasoning: { input: 3, output: 9, image: 0 },
  image: { input: 0, output: 0, image: 10 },
}

/**
 * The model every alias uses when the environment does not name one.
 *
 * These are the models the providers are known for; the operator points the
 * aliases at the ones of their account with the environment.
 */
const DEFAULT_MODELS: Record<AiProviderName, Partial<Record<AiAlias, string>>> = {
  stub: { chat: 'stub', fast: 'stub', reasoning: 'stub', image: 'stub' },
  anthropic: {
    chat: 'claude-sonnet-4-5',
    fast: 'claude-haiku-4-5',
    reasoning: 'claude-sonnet-4-5',
  },
  openai: { chat: 'gpt-4.1', fast: 'gpt-4.1-mini', reasoning: 'o4-mini', image: 'gpt-image-1' },
  google: { chat: 'gemini-2.5-pro', fast: 'gemini-2.5-flash', reasoning: 'gemini-2.5-pro' },
  deepseek: { chat: 'deepseek-chat', fast: 'deepseek-chat', reasoning: 'deepseek-reasoner' },
  openrouter: { chat: 'openai/gpt-4.1', fast: 'openai/gpt-4.1-mini' },
  qwen: { chat: 'qwen-plus', fast: 'qwen-turbo' },
  kimi: { chat: 'moonshot-v1-8k', fast: 'moonshot-v1-8k' },
  glm: { chat: 'glm-4-plus', fast: 'glm-4-flash' },
  ollama: { chat: 'llama3.2', fast: 'llama3.2' },
  compatible: {},
}

/**
 * What the registry is built from. The values come from the environment, but
 * they are plain data, so the registry can be built with any of them.
 */
export type AiRegistryInput = {
  /** The environment the application runs in. */
  nodeEnv: string
  /** The provider every alias uses when it does not name one. */
  provider?: string
  /** How long a call to the provider may take. */
  timeoutMs?: number
  /** The provider and the model of every alias. */
  aliases: Partial<Record<AiAlias, { provider?: string; model?: string }>>
  /** The key of every provider, to know which ones are configured. */
  keys: Partial<Record<AiProviderName, string | undefined>>
}

/**
 * Builds the registry of the models from the environment.
 *
 * Outside production a provider without a key is replaced by the stub, so a
 * developer can work on the product without an account of any vendor. In
 * production the stub is refused: the application has to talk to a real
 * provider.
 */
export function buildAiRegistry(input: AiRegistryInput): AiRegistry {
  const aliases = {} as Record<AiAlias, AiAliasConfig>

  for (const alias of AI_ALIASES) {
    const provider = providerOf(alias, input)
    const requested = input.aliases[alias]?.model

    aliases[alias] = {
      alias,
      provider,
      modelId: requested || DEFAULT_MODELS[provider][alias] || '',
      capabilities: ALIAS_CAPABILITIES[alias].filter((capability) =>
        PROVIDER_CAPABILITIES[provider].includes(capability)
      ),
      pricing: ALIAS_PRICING[alias],
    }
  }

  return {
    provider: providerOf('chat', input),
    timeoutMs: input.timeoutMs ?? AI_DEFAULT_TIMEOUT_MS,
    aliases,
  }
}

/**
 * The provider that serves an alias: the one the alias names, the default one
 * of the environment, or the stub.
 */
function providerOf(alias: AiAlias, input: AiRegistryInput): AiProviderName {
  const requested = input.aliases[alias]?.provider || input.provider || 'stub'

  if (!AI_PROVIDERS.includes(requested as AiProviderName)) {
    throw new Error(`The AI provider "${requested}" of the alias "${alias}" does not exist`)
  }

  const provider = requested as AiProviderName

  if (provider === 'stub') {
    if (input.nodeEnv === 'production') {
      throw new Error('The AI provider has to be configured in production')
    }

    return 'stub'
  }

  if (input.keys[provider]) {
    return provider
  }

  if (input.nodeEnv === 'production') {
    throw new Error(`The AI provider "${provider}" has no API key`)
  }

  return 'stub'
}

/**
 * The registry of the models of the application, built from the environment.
 */
export default buildAiRegistry({
  nodeEnv: env.get('NODE_ENV'),
  provider: env.get('AI_PROVIDER'),
  timeoutMs: env.get('AI_TIMEOUT_MS'),
  aliases: {
    chat: { provider: env.get('AI_CHAT_PROVIDER'), model: env.get('AI_CHAT_MODEL') },
    fast: { provider: env.get('AI_FAST_PROVIDER'), model: env.get('AI_FAST_MODEL') },
    reasoning: { provider: env.get('AI_REASONING_PROVIDER'), model: env.get('AI_REASONING_MODEL') },
    image: { provider: env.get('AI_IMAGE_PROVIDER'), model: env.get('AI_IMAGE_MODEL') },
  },
  keys: {
    anthropic: env.get('ANTHROPIC_API_KEY'),
    openai: env.get('OPENAI_API_KEY'),
    google: env.get('GOOGLE_GENERATIVE_AI_API_KEY'),
    deepseek: env.get('DEEPSEEK_API_KEY'),
    openrouter: env.get('OPENROUTER_API_KEY'),
    qwen: env.get('QWEN_API_KEY'),
    kimi: env.get('KIMI_API_KEY'),
    glm: env.get('GLM_API_KEY'),
    ollama: env.get('OLLAMA_API_KEY'),
    compatible: env.get('COMPATIBLE_API_KEY'),
  },
})
