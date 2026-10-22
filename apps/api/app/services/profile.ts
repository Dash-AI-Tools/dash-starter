import Membership from '#models/membership'
import type User from '#models/user'
import { EntitlementService } from '#services/entitlements'
import db from '@adonisjs/lucid/services/db'
import { errors as VineErrors, type ValidationError } from '@vinejs/vine'

/**
 * The biggest avatar the API accepts.
 */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

/**
 * The image formats the API accepts as an avatar.
 */
export const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

/**
 * The extension of every accepted format, used to name the file in the disk.
 */
const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

/**
 * The key of the avatar of a user inside the disk. The user id keeps the
 * files of two accounts apart, and the random name keeps the old avatar from
 * being overwritten.
 */
export function avatarKey(userId: number, mimeType: string, random: string): string {
  return `avatars/${userId}/${random}.${AVATAR_EXTENSIONS[mimeType] ?? 'bin'}`
}

/**
 * The error of an avatar that is not allowed: the format is unknown or the
 * file is too big.
 */
export function avatarRejectedError(message: string, rule: string): ValidationError {
  return new VineErrors.E_VALIDATION_ERROR([{ field: 'avatar', message, rule }])
}

/**
 * The organizations where the user is the only owner and there are other
 * members inside them. The account cannot be deleted while one of them
 * exists, because the organization would be left without an owner.
 */
export async function blockingOwnedOrganizations(user: User) {
  const memberships = await Membership.query()
    .where('userId', user.id)
    .where('role', 'owner')
    .preload('organization')

  if (memberships.length === 0) {
    return []
  }

  /**
   * The members and the owners of every organization of the user, in a single
   * query, so the guard does not run one query per organization.
   */
  const counts = await db
    .query()
    .from('memberships')
    .select('organization_id')
    .select(db.raw('count(*) as total'))
    .select(db.raw("count(*) filter (where role = 'owner') as owners"))
    .whereIn(
      'organization_id',
      memberships.map((membership) => membership.organizationId)
    )
    .groupBy('organization_id')

  const byOrganization = new Map(
    counts.map((row) => [
      Number(row.organization_id),
      { members: Number(row.total), owners: Number(row.owners) },
    ])
  )

  /**
   * The organization of the user blocks the deletion when nobody else owns it
   * and it has other members inside.
   */
  const withMembers = memberships.filter((membership) => {
    const tally = byOrganization.get(membership.organizationId)

    return !!tally && tally.owners === 1 && tally.members > 1
  })

  if (withMembers.length > 0) {
    return withMembers.map((membership) => membership.organization)
  }

  /**
   * The subscription of an organization is lost when the account of its only
   * owner is deleted, so a plan that is being paid for blocks the deletion.
   */
  for (const membership of memberships) {
    const tally = byOrganization.get(membership.organizationId)

    if (!tally || tally.owners !== 1) {
      continue
    }

    const plan = await EntitlementService.for(membership.organization)

    if (!plan.isDefaultFree) {
      return [membership.organization]
    }
  }

  return []
}

/**
 * Whether the account of the user can be deleted.
 */
export async function canDeleteAccount(user: User): Promise<boolean> {
  const blocking = await blockingOwnedOrganizations(user)
  return blocking.length === 0
}
