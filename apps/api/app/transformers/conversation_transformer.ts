import type Conversation from '#models/conversation'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class ConversationTransformer extends BaseTransformer<Conversation> {
  toObject() {
    const conversation = this.resource

    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    }
  }
}
