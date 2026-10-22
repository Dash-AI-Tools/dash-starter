import { SubscriptionSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import PlanPrice from '#models/plan_price'

/**
 * The states a subscription goes through. They follow the states of the
 * payment provider.
 */
export const SUBSCRIPTION_STATUSES = [
  'inactive',
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'paused',
  'canceled',
  'expired',
] as const

/**
 * The state of a subscription.
 */
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export default class Subscription extends SubscriptionSchema {
  /**
   * The organization the subscription belongs to.
   */
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * The price the subscription pays.
   */
  @belongsTo(() => PlanPrice)
  declare planPrice: BelongsTo<typeof PlanPrice>

  /**
   * The state of the subscription.
   */
  declare status: SubscriptionStatus
}
