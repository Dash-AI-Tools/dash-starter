import { MessageSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Conversation from '#models/conversation'
import type { UIMessage } from 'ai'

/**
 * A part of a message, in the format the AI SDK uses for the messages of the
 * interface: a text, a tool call or the output of a tool.
 */
export type MessagePart = UIMessage['parts'][number]

/**
 * Who wrote a message.
 */
export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const

export type MessageRole = (typeof MESSAGE_ROLES)[number]

export default class Message extends MessageSchema {
  /**
   * The conversation the message belongs to.
   */
  @belongsTo(() => Conversation)
  declare conversation: BelongsTo<typeof Conversation>

  /**
   * The parts of the message. The value is serialized before it reaches the
   * driver, because a plain array is not a valid `jsonb` literal.
   */
  @column({ prepare: (value) => JSON.stringify(value) })
  declare parts: MessagePart[]
}
