import { PlanPriceSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Plan from '#models/plan'

/**
 * The intervals a plan can be paid with.
 */
export const PLAN_INTERVALS = ['month', 'year'] as const

/**
 * The interval a price is paid with.
 */
export type PlanInterval = (typeof PLAN_INTERVALS)[number]

export default class PlanPrice extends PlanPriceSchema {
  /**
   * The plan the price belongs to.
   */
  @belongsTo(() => Plan)
  declare plan: BelongsTo<typeof Plan>

  /**
   * The interval the price is paid with.
   */
  declare interval: PlanInterval
}
