import type { AiRegistry } from '#config/ai'
import type { SupportedLocale } from '#app/locales'
import type Conversation from '#models/conversation'
import Message from '#models/message'
import type { MessagePart, MessageRole } from '#models/message'
import type Organization from '#models/organization'
import { AiService } from '#services/ai'
import { STUB_TEXT } from '#services/ai_models'
import { usedCredits } from '#services/ai_usage'
import { EntitlementService } from '#services/entitlements'
import { toolRegistry } from '#tools/main'
import type { ToolContext } from '#tools/registry'
import config from '@adonisjs/core/services/config'
import i18nManager from '@adonisjs/i18n/services/main'
import { convertToModelMessages, tool, type ModelMessage, type ToolSet, type UIMessage } from 'ai'

/**
 * The tools of the registry, in the shape the AI SDK expects.
 *
 * Every tool of the registry is offered to the model, including the ones the
 * caller is not allowed to use: the registry answers with a permission error
 * and the model tells the member that it cannot see that information. A tool
 * the model cannot use is better than a tool it does not know about, because
 * the member learns the truth instead of a made up answer.
 */
export function chatTools(ctx: ToolContext): ToolSet {
  const tools: ToolSet = {}

  for (const definition of toolRegistry.all()) {
    tools[definition.name] = tool({
      description: translate(ctx.locale, definition.descriptionKey),
      inputSchema: definition.schema,
      execute: async (input) => {
        const outcome = await toolRegistry.call(definition.name, input, ctx)

        if (outcome.status === 'denied') {
          return { error: outcome.code, message: outcome.message }
        }

        return outcome.data
      },
    })
  }

  return tools
}

/**
 * The instructions the assistant gets.
 *
 * The answer is written in the language of the member, unless the member
 * writes in another one.
 */
export function chatSystemPrompt(ctx: ToolContext): string {
  return translate(ctx.locale, 'chat.systemPrompt', {
    organization: ctx.organization.name,
    language: translate(ctx.locale, 'chat.language'),
  })
}

/**
 * The messages of the conversation, in the shape the model reads them.
 */
export async function chatModelMessages(
  conversation: Conversation,
  tools: ToolSet
): Promise<ModelMessage[]> {
  const messages = await conversation.related('messages').query().orderBy('id', 'asc')

  return convertToModelMessages(
    messages.map((message) => ({
      role: message.role as 'user' | 'assistant',
      parts: message.parts as UIMessage['parts'],
    })),
    { tools }
  )
}

/**
 * Writes a message of the conversation.
 */
export async function saveMessage(
  conversation: Conversation,
  role: MessageRole,
  parts: MessagePart[]
): Promise<Message> {
  return Message.create({ conversationId: conversation.id, role, parts })
}

/**
 * Gives a title to a conversation that does not have one yet.
 *
 * The title is a nicety: when the model fails to write it, the conversation
 * keeps working without one.
 */
export async function titleConversation(
  conversation: Conversation,
  message: string,
  ctx: ToolContext
): Promise<void> {
  if (conversation.title) {
    return
  }

  const service = new AiService()

  const result = await service.generateText(
    { organization: ctx.organization, user: ctx.user, feature: 'chat.title', alias: 'fast' },
    { prompt: translate(ctx.locale, 'chat.titlePrompt', { message }) }
  )

  /**
   * The stub answers every prompt with the same text, so its title would be
   * that text on every conversation: the question names the thread instead.
   */
  const answer = result.text.trim()
  const title = (answer === STUB_TEXT ? message.trim() : answer)
    .replace(/^["'“«]+|["'”»]+$/g, '')
    .slice(0, 120)

  if (!title) {
    return
  }

  conversation.title = title
  await conversation.save()
}

/**
 * What the chat page shows before the first message: the provider in use and
 * how many AI credits are left.
 */
export async function chatStatus(organization: Organization) {
  const [limits, used] = await Promise.all([
    EntitlementService.limits(organization),
    usedCredits(organization),
  ])

  const registry = config.get<AiRegistry>('ai')

  return {
    provider: registry.aliases.chat.provider,
    usedCredits: used,
    limitCredits: limits.aiCredits,
    remainingCredits: limits.aiCredits < 0 ? null : Math.max(0, limits.aiCredits - used),
  }
}

/**
 * Reads a message of the catalog of the locale.
 */
function translate(locale: SupportedLocale, key: string, data?: Record<string, unknown>): string {
  return i18nManager.locale(locale).t(key, data)
}
