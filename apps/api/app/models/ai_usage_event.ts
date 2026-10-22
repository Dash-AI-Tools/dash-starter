import { AiUsageEventSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import User from '#models/user'

/**
 * The outcomes of a call to the provider.
 */
export const AI_USAGE_OUTCOMES = ['success', 'error'] as const

export type AiUsageOutcome = (typeof AI_USAGE_OUTCOMES)[number]

/**
 * A call to the provider, with what it cost and how it ended.
 */
export default class AiUsageEvent extends AiUsageEventSchema {
  /**
   * The organization that paid for the call.
   */
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * The member that made the call.
   */
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  /**
   * How the call ended.
   */
  declare outcome: AiUsageOutcome
}
