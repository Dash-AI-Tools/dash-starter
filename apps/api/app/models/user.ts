import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Membership from '#models/membership'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  /**
   * The organizations the user belongs to.
   */
  @hasMany(() => Membership)
  declare memberships: HasMany<typeof Membership>

  /**
   * Whether the user proved ownership of the email address. The verified
   * users can reach the paid features and invite members.
   */
  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null
  }

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
