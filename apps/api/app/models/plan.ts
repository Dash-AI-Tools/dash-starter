import { PlanSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import PlanPrice from '#models/plan_price'

/**
 * A text with one entry per supported locale, for example
 * `{ en: 'Free', es: 'Gratis' }`.
 */
export type LocalizedText = { en: string; es: string }

/**
 * A list of texts, one list per supported locale.
 */
export type LocalizedFeatures = { en: string[]; es: string[] }

/**
 * The limits of a plan. A value of `-1` means that the limit does not exist.
 */
export type Entitlements = {
  /** How many people can be members of the organization. */
  seats: number
  /** How many AI credits the organization gets every month. */
  aiCredits: number
  /** Whether the organization can reach the MCP server. */
  mcpEnabled: boolean
  /** How many MCP calls the organization can make every month. */
  mcpCalls: number
  /** How many MCP requests the organization can make every minute. */
  mcpRpm: number
}

export default class Plan extends PlanSchema {
  /**
   * The prices of the plan, one per interval.
   */
  @hasMany(() => PlanPrice)
  declare prices: HasMany<typeof PlanPrice>

  /**
   * The name of the plan, in every supported language.
   */
  declare name: LocalizedText

  /**
   * The description of the plan, in every supported language.
   */
  declare description: LocalizedText

  /**
   * The bullets of the pricing page, in every supported language.
   */
  declare features: LocalizedFeatures

  /**
   * The limits the plan gives to the organization.
   */
  declare entitlements: Entitlements
}
