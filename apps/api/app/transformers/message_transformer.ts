import type Message from '#models/message'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class MessageTransformer extends BaseTransformer<Message> {
  toObject() {
    const message = this.resource

    return {
      id: message.id,
      role: message.role,
      parts: message.parts,
      createdAt: message.createdAt,
    }
  }
}
