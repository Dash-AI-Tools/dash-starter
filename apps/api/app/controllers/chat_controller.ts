import { isSupportedLocale, type SupportedLocale } from '#app/locales'
import { E_CONVERSATION_NOT_FOUND } from '#exceptions/errors'
import Conversation from '#models/conversation'
import type { MessagePart } from '#models/message'
import type Organization from '#models/organization'
import { AiService } from '#services/ai'
import {
  chatModelMessages,
  chatStatus,
  chatSystemPrompt,
  chatTools,
  saveMessage,
  titleConversation,
} from '#services/chat'
import { consumeChatBudget } from '#services/rate_limits'
import type { ToolContext } from '#tools/registry'
import ConversationTransformer from '#transformers/conversation_transformer'
import MessageTransformer from '#transformers/message_transformer'
import { renameConversationValidator, sendMessageValidator } from '#validators/chat'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

export default class ChatController {
  /**
   * The conversations of the member in the organization.
   *
   * A conversation is private to the member that wrote it, so the list never
   * shows the conversations of the other members.
   */
  async conversations({ auth, organization, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    const conversations = await Conversation.query()
      .where('organizationId', organization.id)
      .where('userId', user.id)
      .orderBy('updatedAt', 'desc')

    return serialize.withoutWrapping({
      conversations: ConversationTransformer.transform(conversations),
    })
  }

  /**
   * A conversation of the member, with its messages.
   */
  async show(ctx: HttpContext) {
    const conversation = await this.findConversation(ctx)
    const messages = await conversation.related('messages').query().orderBy('id', 'asc')

    return ctx.serialize.withoutWrapping({
      conversation: ConversationTransformer.transform(conversation),
      messages: MessageTransformer.transform(messages),
    })
  }

  /**
   * Renames a conversation of the member.
   */
  async rename(ctx: HttpContext) {
    const { title } = await ctx.request.validateUsing(renameConversationValidator)
    const conversation = await this.findConversation(ctx)

    conversation.title = title
    await conversation.save()

    return ctx.serialize.withoutWrapping({
      conversation: ConversationTransformer.transform(conversation),
    })
  }

  /**
   * Deletes a conversation of the member, with its messages.
   */
  async destroy(ctx: HttpContext) {
    const conversation = await this.findConversation(ctx)

    await conversation.delete()

    return { success: true }
  }

  /**
   * What the chat page shows before the first message: the provider in use
   * and how many AI credits are left.
   */
  async status({ organization, serialize }: HttpContext) {
    return serialize.withoutWrapping({
      chat: await chatStatus(organization),
    })
  }

  /**
   * Sends a message to the assistant and streams the answer.
   *
   * The server is the one that knows the conversation: the client only says
   * which conversation it is talking about and what the member wrote, so a
   * client cannot read the conversation of somebody else.
   */
  async send(ctx: HttpContext) {
    const { request, response, auth, organization, membership } = ctx

    const { conversationId, message } = await request.validateUsing(sendMessageValidator)
    const user = auth.getUserOrFail()

    await consumeChatBudget(user.id)

    const conversation = conversationId
      ? await this.findConversationOf(organization, user.id, conversationId)
      : await Conversation.create({ organizationId: organization.id, userId: user.id })

    /**
     * The client needs the identifier of the conversation to keep talking to
     * it, and the stream of the answer does not carry it.
     */
    response.header('x-conversation-id', String(conversation.id))

    await saveMessage(conversation, 'user', [{ type: 'text', text: message }])

    const toolContext: ToolContext = {
      organization,
      membership,
      user,
      locale: this.localeOf(ctx),
    }

    const tools = chatTools(toolContext)
    const history = await chatModelMessages(conversation, tools)

    /**
     * The client can stop the generation at any moment. When the connection
     * goes away, the signal cancels the call to the provider and the tokens
     * that were written are still counted.
     */
    const abort = new AbortController()
    response.onFinish(() => abort.abort())

    const service = new AiService()
    const result = await service.streamText(
      { organization, user, feature: 'chat', alias: 'chat' },
      {
        system: chatSystemPrompt(toolContext),
        messages: history,
        tools,
        abortSignal: abort.signal,
      }
    )

    const stream = result.toUIMessageStreamResponse({
      onEnd: async ({ responseMessage }) => {
        await saveMessage(conversation, 'assistant', responseMessage.parts as MessagePart[])

        try {
          await titleConversation(conversation, message, toolContext)
        } catch (error) {
          logger.warn({ err: error }, 'The chat could not write the title of the conversation')
        }
      },
    })

    stream.headers.forEach((value, key) => response.header(key, value))

    return response.stream(stream.body!)
  }

  /**
   * The conversation of the request, when it belongs to the member.
   */
  private async findConversation(ctx: HttpContext) {
    const user = ctx.auth.getUserOrFail()

    return this.findConversationOf(ctx.organization, user.id, Number(ctx.params.id))
  }

  /**
   * The conversation of the member in the organization.
   *
   * A conversation of another member is not found, so the answer never
   * reveals that it exists.
   */
  private async findConversationOf(organization: Organization, userId: number, id: number) {
    const conversation = await Conversation.query()
      .where('organizationId', organization.id)
      .where('userId', userId)
      .where('id', id)
      .first()

    if (!conversation) {
      throw new E_CONVERSATION_NOT_FOUND()
    }

    return conversation
  }

  /**
   * The language the assistant answers in.
   */
  private localeOf(ctx: HttpContext): SupportedLocale {
    return isSupportedLocale(ctx.i18n.locale) ? ctx.i18n.locale : 'en'
  }
}
