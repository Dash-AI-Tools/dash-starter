import vine from '@vinejs/vine'

/**
 * The payload of a message sent to the assistant. The conversation is
 * optional: when it is missing, the message starts a new one.
 */
export const sendMessageValidator = vine.create({
  conversationId: vine.number().positive().optional(),
  message: vine.string().trim().minLength(1).maxLength(8000),
})

/**
 * The payload of the rename of a conversation.
 */
export const renameConversationValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(120),
})
