import type Invitation from '#models/invitation'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class InvitationTransformer extends BaseTransformer<Invitation> {
  toObject() {
    const invitation = this.resource

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
      createdAt: invitation.createdAt,
      invitedBy: invitation.invitedBy
        ? {
            id: invitation.invitedBy.id,
            fullName: invitation.invitedBy.fullName,
          }
        : null,
    }
  }
}
