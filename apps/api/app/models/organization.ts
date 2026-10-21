import { OrganizationSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Invitation from '#models/invitation'
import Membership from '#models/membership'

export default class Organization extends OrganizationSchema {
  /**
   * The members of the organization, with the role they hold in it.
   */
  @hasMany(() => Membership)
  declare memberships: HasMany<typeof Membership>

  /**
   * The invitations sent for the organization.
   */
  @hasMany(() => Invitation)
  declare invitations: HasMany<typeof Invitation>
}
