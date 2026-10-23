import { OrganizationSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import BulkImport from '#models/bulk_import'
import Invitation from '#models/invitation'
import Invoice from '#models/invoice'
import Membership from '#models/membership'

/**
 * The progress of the setup of an organization. It is saved after every step,
 * so the user can come back to the setup later.
 */
export type OnboardingState = {
  /** The size of the team of the organization. */
  teamSize?: string
  /** What the organization will use the product for. */
  useCase?: string
  /** When the invitations of the team were sent, or the step was skipped. */
  invitesSentAt?: string
  /** The plan the user chose, which becomes active with the checkout. */
  plan?: { key: string; interval: string }
}

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

  /**
   * The bulk imports of invitations of the organization.
   */
  @hasMany(() => BulkImport)
  declare imports: HasMany<typeof BulkImport>

  /**
   * The invoices of the organization, recorded from the events of the
   * payment provider.
   */
  @hasMany(() => Invoice)
  declare invoices: HasMany<typeof Invoice>

  /**
   * The progress of the setup of the organization.
   */
  declare onboardingState: OnboardingState | null
}
