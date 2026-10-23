import ApiKey from '#models/api_key'
import Invitation from '#models/invitation'
import Membership from '#models/membership'
import type Organization from '#models/organization'
import type User from '#models/user'
import { usedCredits } from '#services/ai_usage'
import { API_KEY_TYPE } from '#services/api_keys'
import { EntitlementService } from '#services/entitlements'
import { mcpUsage } from '#services/mcp_usage'
import { usedSeats } from '#services/organizations'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * The days the usage chart of the dashboard covers, today included.
 */
export const USAGE_DAYS = 7

/**
 * The entries of activity the dashboard shows.
 */
export const ACTIVITY_LIMIT = 10

/**
 * What happened in the organization.
 */
export type ActivityType = 'member_joined' | 'invitation_sent' | 'api_key_created'

/**
 * The person that did something in the organization, as every member can see
 * them: the name and the initials, never the email address.
 */
export type ActivityActor = { fullName: string; initials: string }

/**
 * An entry of the activity of the organization.
 */
export type ActivityEntry = {
  type: ActivityType
  actor: ActivityActor | null
  at: string
}

/**
 * The AI credits the organization used on a UTC day.
 */
export type UsageDay = { date: string; credits: number }

/**
 * The metrics of the organization, as the dashboard home shows them.
 *
 * Every number comes from the reader that already owns it, so the dashboard
 * and the billing page always agree. A limit of `-1` means unlimited.
 *
 * The response carries no email, no invitation address and no key name or
 * prefix: every member reads it, and those details belong to the admin pages.
 */
export async function dashboardState(organization: Organization) {
  const limits = await EntitlementService.limits(organization)
  const mcp = await mcpUsage(organization)

  return {
    members: await membersOf(organization),
    seats: { used: await usedSeats(organization), limit: limits.seats },
    aiCredits: { used: await usedCredits(organization), limit: limits.aiCredits },
    mcpCalls: { used: mcp.total, limit: limits.mcpCalls, enabled: limits.mcpEnabled },
    usage: await usageByDay(organization),
    activity: await activityOf(organization),
  }
}

/**
 * The number of members of the organization.
 */
async function membersOf(organization: Organization): Promise<number> {
  const row = await db
    .query()
    .from('memberships')
    .where('organization_id', organization.id)
    .count('* as total')
    .firstOrFail()

  return Number(row.total)
}

/**
 * The AI credits the organization used on each of the last UTC days, the
 * oldest first and today last. The days without usage count `0`, so the
 * series always has a point per day.
 */
async function usageByDay(organization: Organization): Promise<UsageDay[]> {
  const today = DateTime.utc().startOf('day')
  const first = today.minus({ days: USAGE_DAYS - 1 })

  /**
   * The day is computed and returned as text: a `date` value would be turned
   * into a local midnight by the driver.
   */
  const rows: { day: string; total: string | number }[] = await db
    .query()
    .from('ai_usage_events')
    .where('organization_id', organization.id)
    .where('created_at', '>=', first.toJSDate())
    .select(db.raw(`to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day`))
    .sum('credits as total')
    .groupByRaw(`to_char(created_at at time zone 'UTC', 'YYYY-MM-DD')`)

  const credits = new Map(rows.map((row) => [row.day, Number(row.total)]))

  return Array.from({ length: USAGE_DAYS }, (_, index) => {
    const date = first.plus({ days: index }).toISODate()!
    return { date, credits: credits.get(date) ?? 0 }
  })
}

/**
 * The newest entries of activity of the organization, the newest first.
 *
 * The activity is derived from the tables that already record who did what
 * and when. Each source is bounded, so the cost stays flat however old the
 * organization is.
 */
async function activityOf(organization: Organization): Promise<ActivityEntry[]> {
  const memberships = await Membership.query()
    .where('organizationId', organization.id)
    .preload('user')
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'desc')
    .limit(ACTIVITY_LIMIT)

  const invitations = await Invitation.query()
    .where('organizationId', organization.id)
    .preload('invitedBy')
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'desc')
    .limit(ACTIVITY_LIMIT)

  const apiKeys = await ApiKey.query()
    .where('tokenableId', organization.id)
    .where('type', API_KEY_TYPE)
    .preload('creator')
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'desc')
    .limit(ACTIVITY_LIMIT)

  const entries = [
    ...memberships.map((membership) => ({
      type: 'member_joined' as const,
      actor: actorOf(membership.user),
      at: membership.createdAt,
    })),
    ...invitations.map((invitation) => ({
      type: 'invitation_sent' as const,
      actor: actorOf(invitation.invitedBy),
      at: invitation.createdAt,
    })),
    ...apiKeys.map((apiKey) => ({
      type: 'api_key_created' as const,
      actor: actorOf(apiKey.creator),
      at: apiKey.createdAt,
    })),
  ]

  return entries
    .sort((left, right) => right.at.toMillis() - left.at.toMillis())
    .slice(0, ACTIVITY_LIMIT)
    .map((entry) => ({ type: entry.type, actor: entry.actor, at: entry.at.toUTC().toISO()! }))
}

/**
 * The name and the initials of a user, or nothing when the user is gone.
 */
function actorOf(user: User | null | undefined): ActivityActor | null {
  if (!user) {
    return null
  }

  return { fullName: user.fullName, initials: user.initials }
}
