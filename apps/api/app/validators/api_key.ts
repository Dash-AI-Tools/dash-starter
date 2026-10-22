import { API_KEY_SCOPES } from '#services/api_keys'
import vine from '@vinejs/vine'

/**
 * The payload of the creation of an API key.
 *
 * A key always holds at least one scope, and it may expire: the days it
 * lives are up to the admin that creates it.
 */
export const createApiKeyValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(120),
  scopes: vine.array(vine.enum(API_KEY_SCOPES)).minLength(1),
  expiresAt: vine.date().optional(),
})
