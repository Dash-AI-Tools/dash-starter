import { InvitationSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'
import type { Role } from '#models/membership'
import User from '#models/user'

export default class Invitation extends InvitationSchema {
  /**
   * The role the invited person will hold in the organization.
   */
  declare role: Role

  /**
   * The organization the invitation is for.
   */
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  /**
   * The member that sent the invitation.
   */
  @belongsTo(() => User, { foreignKey: 'invitedById' })
  declare invitedBy: BelongsTo<typeof User>

  /**
   * Whether the invitation can still be accepted.
   */
  get isPending(): boolean {
    return !this.acceptedAt && !this.revokedAt && this.expiresAt.toMillis() > Date.now()
  }
}
