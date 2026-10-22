import type { AiAlias, AiAliasConfig, AiCapability, AiRegistry } from '#config/ai'
import { E_AI_ALIAS_UNAVAILABLE, E_AI_QUOTA_EXCEEDED, E_AI_UNAVAILABLE } from '#exceptions/errors'
import AiUsageEvent from '#models/ai_usage_event'
import type { AiUsageOutcome } from '#models/ai_usage_event'
import type Organization from '#models/organization'
import type User from '#models/user'
import { imageModelOf, languageModelOf } from '#services/ai_models'
import { notifyQuotaThresholds, usedCredits } from '#services/ai_usage'
import { EntitlementService } from '#services/entitlements'
import { randomUUID } from 'node:crypto'
import type { FlexibleSchema, ImageModel, LanguageModel, ModelMessage, ToolSet } from 'ai'
import { Output, generateImage, generateText, streamText } from 'ai'
import config from '@adonisjs/core/services/config'
import logger from '@adonisjs/core/services/logger'

/**
 * Who is asking for a generation, and what it is for.
 */
export type AiContext = {
  /** The organization that pays for the call. */
  organization: Organization
  /** The member that made the call. */
  user: User
  /** The feature that asked for the generation. */
  feature: string
  /** The purpose of the model the feature needs. */
  alias: AiAlias
}

/**
 * The prompt of a call. A call has either a prompt or a list of messages,
 * never both.
 */
export type AiPromptOptions =
  | { prompt: string; messages?: never; system?: string }
  | { messages: ModelMessage[]; prompt?: never; system?: string }

/**
 * The options of a streamed call.
 */
export type AiStreamOptions<TOOLS extends ToolSet> = AiPromptOptions & {
  /** The tools the model can call. */
  tools?: TOOLS
  /**
   * The signal that cancels the generation. It is aborted when the client
   * stops the answer or goes away.
   */
  abortSignal?: AbortSignal
}

/**
 * The tokens a call used.
 */
export type AiUsage = {
  /** The tokens of the prompt. */
  inputTokens: number
  /** The tokens of the answer. */
  outputTokens: number
}

/**
 * The answer of a call that generated text.
 */
export type AiTextResult = {
  /** The text the model wrote. */
  text: string
  /** The tokens the call used. */
  usage: AiUsage
  /** The credits the call cost. */
  credits: number
}

/**
 * The answer of a call that generated an object.
 */
export type AiObjectResult<T> = {
  /** The object the model wrote, validated against the schema. */
  object: T
  /** The tokens the call used. */
  usage: AiUsage
  /** The credits the call cost. */
  credits: number
}

/**
 * The answer of a call that generated images.
 */
export type AiImageResult = {
  /** The URL of the image, in the storage of the application. */
  url: string
  /** How many images were generated. */
  images: number
  /** The credits the call cost. */
  credits: number
}

/**
 * The models the service talks to.
 *
 * The real ones come from the providers of the registry, and the tests give
 * the service a mock, so a call can be made to fail on purpose.
 */
export type AiModels = {
  /** The model that writes the text of an alias. */
  languageModel: (alias: AiAliasConfig) => LanguageModel
  /** The model that draws the images of an alias. */
  imageModel: (alias: AiAliasConfig) => ImageModel
}

/**
 * The service every feature uses to talk to a model.
 *
 * The service is the only door to the provider: it checks the quota of the
 * organization before the call, applies the timeout, maps the errors of the
 * provider to the errors of the API and records what every call cost.
 */
export class AiService {
  /** The registry of the models of the application. */
  private registry: AiRegistry
  /** The models the service talks to. */
  private models: AiModels

  constructor(registry?: AiRegistry, models?: AiModels) {
    this.registry = registry ?? config.get<AiRegistry>('ai')
    this.models = models ?? { languageModel: languageModelOf, imageModel: imageModelOf }
  }

  /**
   * Generates text with the model of the alias.
   */
  async generateText(context: AiContext, options: AiPromptOptions): Promise<AiTextResult> {
    const alias = this.aliasOf(context, 'text')
    const used = await this.assertQuota(context.organization)

    let usage: AiUsage = { inputTokens: 0, outputTokens: 0 }
    let credits = 0
    let outcome: AiUsageOutcome = 'success'
    let errorMessage: string | undefined
    const startedAt = Date.now()

    try {
      const result = await generateText({
        model: this.models.languageModel(alias),
        ...options,
        timeout: { totalMs: this.registry.timeoutMs },
      })

      usage = usageOf(result.usage)
      credits = creditsOf(alias, usage, 0)

      return { text: result.text, usage, credits }
    } catch (error) {
      outcome = 'error'
      errorMessage = messageOf(error)

      throw this.mapError(error, context, alias)
    } finally {
      await this.record({
        context,
        alias,
        usage,
        credits,
        images: 0,
        latencyMs: Date.now() - startedAt,
        outcome,
        errorMessage,
        usedBefore: used,
      })
    }
  }

  /**
   * Generates text with the model of the alias, and streams it.
   *
   * The usage of a stream is only known when it ends, so the call is recorded
   * when the stream ends, when it is aborted and when it fails.
   */
  async streamText<TOOLS extends ToolSet = ToolSet>(
    context: AiContext,
    options: AiStreamOptions<TOOLS>
  ): Promise<ReturnType<typeof streamText<TOOLS>>> {
    const alias = this.aliasOf(context, 'stream')
    const used = await this.assertQuota(context.organization)
    const startedAt = Date.now()

    return streamText({
      model: this.models.languageModel(alias),
      ...options,
      timeout: { firstChunkMs: this.registry.timeoutMs },
      onEnd: async (event) => {
        const usage = usageOf(event.usage)

        await this.record({
          context,
          alias,
          usage,
          credits: creditsOf(alias, usage, 0),
          images: 0,
          latencyMs: Date.now() - startedAt,
          outcome: 'success',
          usedBefore: used,
        })
      },
      onAbort: async ({ steps }) => {
        /**
         * The answer was stopped on purpose, so the tokens that were written
         * are counted even though the stream never finished.
         */
        const usage = usageOf(steps[steps.length - 1]?.usage ?? {})

        await this.record({
          context,
          alias,
          usage,
          credits: creditsOf(alias, usage, 0),
          images: 0,
          latencyMs: Date.now() - startedAt,
          outcome: 'success',
          usedBefore: used,
        })
      },
      onError: async ({ error }) => {
        logger.error({ err: error, feature: context.feature }, 'The AI provider failed')

        await this.record({
          context,
          alias,
          usage: { inputTokens: 0, outputTokens: 0 },
          credits: 0,
          images: 0,
          latencyMs: Date.now() - startedAt,
          outcome: 'error',
          errorMessage: messageOf(error),
          usedBefore: used,
        })
      },
    })
  }

  /**
   * Generates an object that matches a schema with the model of the alias.
   */
  async generateObject<T>(
    context: AiContext,
    options: AiPromptOptions & { schema: FlexibleSchema<T> }
  ): Promise<AiObjectResult<T>> {
    const alias = this.aliasOf(context, 'object')
    const used = await this.assertQuota(context.organization)

    let usage: AiUsage = { inputTokens: 0, outputTokens: 0 }
    let credits = 0
    let outcome: AiUsageOutcome = 'success'
    let errorMessage: string | undefined
    const startedAt = Date.now()

    try {
      const result = await generateText({
        model: this.models.languageModel(alias),
        ...options,
        output: Output.object({ schema: options.schema }),
        timeout: { totalMs: this.registry.timeoutMs },
      })

      usage = usageOf(result.usage)
      credits = creditsOf(alias, usage, 0)

      return { object: result.output as T, usage, credits }
    } catch (error) {
      outcome = 'error'
      errorMessage = messageOf(error)

      throw this.mapError(error, context, alias)
    } finally {
      await this.record({
        context,
        alias,
        usage,
        credits,
        images: 0,
        latencyMs: Date.now() - startedAt,
        outcome,
        errorMessage,
        usedBefore: used,
      })
    }
  }

  /**
   * Generates images with the model of the alias and stores them in the disk
   * of the organization.
   */
  async generateImage(
    context: AiContext,
    options: { prompt: string; size?: `${number}x${number}` }
  ): Promise<AiImageResult> {
    const alias = this.aliasOf(context, 'image')
    const used = await this.assertQuota(context.organization)

    let usage: AiUsage = { inputTokens: 0, outputTokens: 0 }
    let images = 0
    let credits = 0
    let outcome: AiUsageOutcome = 'success'
    let errorMessage: string | undefined
    const startedAt = Date.now()

    try {
      const result = await generateImage({
        model: this.models.imageModel(alias),
        prompt: options.prompt,
        ...(options.size ? { size: options.size } : {}),
      })

      const { default: drive } = await import('@adonisjs/drive/services/main')
      const disk = await drive.use()
      let url = ''

      for (const image of result.images) {
        const key = `organizations/${context.organization.id}/ai/${randomUUID()}.${extensionOf(image.mediaType)}`
        await disk.put(key, Buffer.from(image.uint8Array))

        if (!url) {
          url = await disk.getUrl(key)
        }
      }

      images = result.images.length
      credits = creditsOf(alias, usage, images)

      return { url, images, credits }
    } catch (error) {
      outcome = 'error'
      errorMessage = messageOf(error)

      throw this.mapError(error, context, alias)
    } finally {
      await this.record({
        context,
        alias,
        usage,
        credits,
        images,
        latencyMs: Date.now() - startedAt,
        outcome,
        errorMessage,
        usedBefore: used,
      })
    }
  }

  /**
   * The alias of the request, when the model behind it can do what the
   * feature needs.
   */
  private aliasOf(context: AiContext, capability: AiCapability): AiAliasConfig {
    const alias = this.registry.aliases[context.alias]

    if (!alias?.modelId || !alias.capabilities.includes(capability)) {
      logger.error(
        { alias: context.alias, capability, provider: alias?.provider },
        'The AI alias cannot be used for this request'
      )

      throw new E_AI_ALIAS_UNAVAILABLE([context.alias])
    }

    return alias
  }

  /**
   * Checks that the organization has credits left, and returns how many it
   * has used in the current period.
   */
  private async assertQuota(organization: Organization): Promise<number> {
    const used = await usedCredits(organization)
    const limits = await EntitlementService.limits(organization)

    if (!EntitlementService.allows(limits.aiCredits, used + 1)) {
      throw new E_AI_QUOTA_EXCEEDED()
    }

    return used
  }

  /**
   * Records what the call cost, and warns the administrators of the
   * organization when the quota is about to run out.
   */
  private async record(params: {
    context: AiContext
    alias: AiAliasConfig
    usage: AiUsage
    credits: number
    images: number
    latencyMs: number
    outcome: AiUsageOutcome
    errorMessage?: string
    usedBefore: number
  }): Promise<void> {
    await AiUsageEvent.create({
      organizationId: params.context.organization.id,
      userId: params.context.user.id,
      feature: params.context.feature,
      alias: params.alias.alias,
      provider: params.alias.provider,
      modelId: params.alias.modelId,
      inputTokens: params.usage.inputTokens,
      outputTokens: params.usage.outputTokens,
      images: params.images,
      credits: params.credits,
      latencyMs: params.latencyMs,
      outcome: params.outcome,
      errorMessage: params.errorMessage ?? null,
    })

    if (params.outcome === 'success') {
      await notifyQuotaThresholds(
        params.context.organization,
        params.usedBefore,
        params.usedBefore + params.credits
      )
    }
  }

  /**
   * Maps the failure of the provider to the error the client receives. The
   * details of the provider never leave the server.
   */
  private mapError(error: unknown, context: AiContext, alias: AiAliasConfig): Error {
    logger.error(
      { err: error, feature: context.feature, alias: alias.alias, provider: alias.provider },
      'The AI provider failed'
    )

    return new E_AI_UNAVAILABLE()
  }
}

/**
 * The tokens a call used.
 */
function usageOf(usage: { inputTokens?: number; outputTokens?: number }): AiUsage {
  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  }
}

/**
 * The credits a call costs, according to the prices of the alias.
 */
function creditsOf(alias: AiAliasConfig, usage: AiUsage, images: number): number {
  const credits =
    (usage.inputTokens / 1000) * alias.pricing.input +
    (usage.outputTokens / 1000) * alias.pricing.output +
    images * alias.pricing.image

  return Math.round(credits * 10000) / 10000
}

/**
 * The extension of the file of an image, taken from its media type.
 */
function extensionOf(mediaType: string): string {
  return mediaType.split('/')[1]?.split('+')[0] || 'png'
}

/**
 * The message of an error, to store it with the usage of the call.
 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
