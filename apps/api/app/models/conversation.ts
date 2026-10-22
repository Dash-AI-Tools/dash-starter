import { ConversationSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Message from '#models/message'
import Organization from '#models/organization'
import User from '#models/user'

export default class Conversation extends ConversationSchema {
  /**
   * The organization the conversation belongs to.
   */
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * The member that wrote the conversation. A conversation is private to the
   * member that created it.
   */
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  /**
   * The messages of the conversation, in the order they were written.
   */
  @hasMany(() => Message)
  declare messages: HasMany<typeof Message>
}
