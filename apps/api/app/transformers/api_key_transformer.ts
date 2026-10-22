import type ApiKey from '#models/api_key'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * An API key of an organization, as the listing shows it.
 *
 * The secret of the key never appears here: only its prefix does, so the
 * admin can tell which key is which without the secret being around.
 */
export default class ApiKeyTransformer extends BaseTransformer<ApiKey> {
  toObject() {
    const key = this.resource

    return {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      scopes: key.scopes,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
    }
  }
}
