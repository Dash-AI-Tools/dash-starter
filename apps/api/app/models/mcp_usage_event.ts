import { McpUsageEventSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import ApiKey from '#models/api_key'
import Organization from '#models/organization'

/**
 * The outcomes of a call to a tool of the MCP server.
 */
export const MCP_USAGE_OUTCOMES = ['ok', 'denied', 'error', 'quota_exceeded'] as const

export type McpUsageOutcome = (typeof MCP_USAGE_OUTCOMES)[number]

/**
 * A call to the MCP server, with the tool it ran and how it ended.
 */
export default class McpUsageEvent extends McpUsageEventSchema {
  /**
   * The organization that paid for the call.
   */
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * The key that made the call.
   */
  @belongsTo(() => ApiKey)
  declare apiKey: BelongsTo<typeof ApiKey>

  /**
   * How the call ended.
   */
  declare outcome: McpUsageOutcome
}
