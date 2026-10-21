import { MembershipSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import User from '#models/user'

/**
 * The roles a member can hold in an organization, from the least to the most
 * powerful one.
 */
export const ROLES = ['member', 'admin', 'owner'] as const

/**
 * The role of a member.
 */
export type Role = (typeof ROLES)[number]

/**
 * Whether a role is at least as powerful as the one that is required.
 */
export function hasRole(role: Role, required: Role): boolean {
  return ROLES.indexOf(role) >= ROLES.indexOf(required)
}

export default class Membership extends MembershipSchema {
  /**
   * The role of the member in the organization.
   */
  declare role: Role

  /**
   * The organization the membership belongs to.
   */
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * The user that holds the membership.
   */
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
