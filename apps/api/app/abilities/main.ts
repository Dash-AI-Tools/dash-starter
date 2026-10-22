import { Bouncer } from '@adonisjs/bouncer'
import { hasRole, type Role } from '#models/membership'
import type Membership from '#models/membership'
import type User from '#models/user'

/**
 * Whether the caller holds the membership and the role of the membership is
 * powerful enough for the action.
 */
function allowed(user: User, membership: Membership, required: Role): boolean {
  return membership.userId === user.id && hasRole(membership.role, required)
}

/**
 * The abilities of an organization, keyed on the role of the caller:
 * `owner > admin > member`.
 *
 * The membership of the caller is resolved by the `org` middleware, so the
 * abilities never have to look it up.
 */
export const updateOrganization = Bouncer.ability((user: User, membership: Membership) =>
  allowed(user, membership, 'admin')
)

export const deleteOrganization = Bouncer.ability((user: User, membership: Membership) =>
  allowed(user, membership, 'owner')
)

export const transferOwnership = Bouncer.ability((user: User, membership: Membership) =>
  allowed(user, membership, 'owner')
)

export const manageInvitations = Bouncer.ability((user: User, membership: Membership) =>
  allowed(user, membership, 'admin')
)

/**
 * The billing of the organization is managed by the admins and the owner.
 */
export const manageBilling = Bouncer.ability((user: User, membership: Membership) =>
  allowed(user, membership, 'admin')
)

/**
 * The two members of a change of a member: the one that asks for it and the
 * one that is affected by it.
 */
export type MemberScope = {
  /** The membership of the caller. */
  actor: Membership
  /** The membership of the member that is being changed or removed. */
  member: Membership
}

/**
 * Whether the caller may change the role of the member. An admin cannot
 * touch the owner of the organization, and cannot hand the ownership over:
 * only an owner can.
 */
export const changeMemberRole = Bouncer.ability(
  (user: User, scope: MemberScope & { role: Role }) => {
    if (!allowed(user, scope.actor, 'admin')) {
      return false
    }

    if (scope.actor.role !== 'owner') {
      if (scope.member.role === 'owner' || scope.role === 'owner') {
        return false
      }
    }

    return true
  }
)

/**
 * Whether the caller may remove the member. An admin cannot remove the
 * owner of the organization: only an owner can.
 */
export const removeMember = Bouncer.ability((user: User, scope: MemberScope) => {
  if (!allowed(user, scope.actor, 'admin')) {
    return false
  }

  if (scope.member.role === 'owner' && scope.actor.role !== 'owner') {
    return false
  }

  return true
})
