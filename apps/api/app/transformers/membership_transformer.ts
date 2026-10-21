import type Membership from '#models/membership'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class MembershipTransformer extends BaseTransformer<Membership> {
  toObject() {
    const membership = this.resource

    return {
      id: membership.id,
      userId: membership.userId,
      role: membership.role,
      createdAt: membership.createdAt,
      user: membership.user
        ? {
            id: membership.user.id,
            fullName: membership.user.fullName,
            email: membership.user.email,
            avatarPath: membership.user.avatarPath,
            initials: membership.user.initials,
            emailVerifiedAt: membership.user.emailVerifiedAt,
          }
        : null,
    }
  }
}
