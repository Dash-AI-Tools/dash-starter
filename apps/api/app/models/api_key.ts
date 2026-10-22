import { ApiKeySchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import User from '#models/user'

/**
 * A key of an organization, used by an external agent to reach the MCP
 * server.
 *
 * The secret of the key is never stored: the provider of the framework keeps
 * only its hash, and the listings show the prefix of the key.
 */
export default class ApiKey extends ApiKeySchema {
  /**
   * The organization the key belongs to.
   */
  @belongsTo(() => Organization, { foreignKey: 'tokenableId' })
  declare organization: BelongsTo<typeof Organization>

  /**
   * The member that created the key.
   */
  @belongsTo(() => User, { foreignKey: 'createdById' })
  declare creator: BelongsTo<typeof User>

  /**
   * The scopes of the key, as the list the provider stores.
   */
  get scopes(): string[] {
    return JSON.parse(this.abilities ?? '[]')
  }
}
