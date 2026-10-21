import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    /**
     * The password is never part of the payload, and neither is its hash.
     */
    return this.pick(this.resource, [
      'id',
      'fullName',
      'email',
      'emailVerifiedAt',
      'locale',
      'theme',
      'avatarPath',
      'pendingEmail',
      'termsVersion',
      'lastOrganizationId',
      'createdAt',
      'updatedAt',
      'initials',
    ])
  }
}
