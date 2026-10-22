import { E_LAST_OWNER } from '#exceptions/errors'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'
import { errors as VineErrors, type ValidationError } from '@vinejs/vine'

/**
 * Turns a name into the slug of the URL: lowercase letters, numbers and
 * dashes.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Finds a slug that nobody uses, appending a number to the given one.
 */
export async function availableSlug(base: string): Promise<string> {
  const root = base || 'organization'

  let candidate = root
  let suffix = 1

  while (await Organization.query().where('slug', candidate).first()) {
    suffix++
    candidate = `${root}-${suffix}`
  }

  return candidate
}

/**
 * The error of a slug that is already taken. The message suggests a free
 * alternative, so the user does not have to guess one.
 */
export function slugTakenError(message: string): ValidationError {
  return new VineErrors.E_VALIDATION_ERROR([{ field: 'slug', message, rule: 'slug_taken' }])
}

/**
 * The number of people the organization can host: its members and the
 * invitations that are still waiting for an answer.
 */
export async function usedSeats(organization: Organization): Promise<number> {
  const members = await db
    .query()
    .from('memberships')
    .where('organization_id', organization.id)
    .count('* as total')
    .firstOrFail()

  const invitations = await db
    .query()
    .from('invitations')
    .where('organization_id', organization.id)
    .whereNull('accepted_at')
    .whereNull('revoked_at')
    .where('expires_at', '>', new Date())
    .count('* as total')
    .firstOrFail()

  return Number(members.total) + Number(invitations.total)
}

/**
 * Refuses the change that would leave the organization without an owner.
 * Every organization has at least one owner, so the last one cannot be
 * demoted or removed.
 */
export async function assertAnotherOwner(organization: Organization): Promise<void> {
  const owners = await db
    .query()
    .from('memberships')
    .where('organization_id', organization.id)
    .where('role', 'owner')
    .count('* as total')
    .firstOrFail()

  if (Number(owners.total) <= 1) {
    throw new E_LAST_OWNER()
  }
}
