import Membership from '#models/membership'
import type Organization from '#models/organization'
import Subscription from '#models/subscription'
import QuotaThreshold from '#mails/quota_threshold'
import { EntitlementService } from '#services/entitlements'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'

/**
 * The percentages of the quota the administrators are warned about.
 */
export const QUOTA_THRESHOLDS = [80, 100] as const

/**
 * The credits the organization has used in the current period.
 */
export async function usedCredits(organization: Organization): Promise<number> {
  const periodStart = await periodStartOf(organization)
  const row = await db
    .query()
    .from('ai_usage_events')
    .where('organization_id', organization.id)
    .where('created_at', '>=', periodStart.toJSDate())
    .sum('credits as total')
    .first()

  return Number(row?.total ?? 0)
}

/**
 * The moment the current period of usage starts.
 *
 * The period of a paid organization is the period of its subscription, and the
 * period of a free one is the calendar month.
 *
 * shortcut: the start of the period is taken from the end of the period, so
 * it can be a day off when the subscription was created in the middle of a
 * month. The subscription would have to keep the start of the period to fix
 * it.
 */
export async function periodStartOf(organization: Organization): Promise<DateTime> {
  const subscription = await Subscription.query()
    .where('organizationId', organization.id)
    .preload('planPrice')
    .first()

  if (subscription?.currentPeriodEnd) {
    const months = subscription.planPrice?.interval === 'year' ? 12 : 1
    return subscription.currentPeriodEnd.minus({ months })
  }

  return DateTime.utc().startOf('month')
}

/**
 * Warns the administrators of the organization when the usage of the period
 * crosses one of the thresholds.
 *
 * The usage only grows, so the crossing of a threshold happens once per
 * period: the email is sent by the call that crosses it.
 */
export async function notifyQuotaThresholds(
  organization: Organization,
  previous: number,
  current: number
): Promise<void> {
  const limits = await EntitlementService.limits(organization)
  const limit = limits.aiCredits

  if (limit < 0) {
    return
  }

  for (const threshold of QUOTA_THRESHOLDS) {
    const mark = (limit * threshold) / 100

    if (previous < mark && current >= mark) {
      await sendQuotaEmail(organization, threshold, current, limit)
    }
  }
}

/**
 * Sends the warning of the threshold to the people that manage the
 * organization.
 */
async function sendQuotaEmail(
  organization: Organization,
  threshold: 80 | 100,
  used: number,
  limit: number
): Promise<void> {
  const memberships = await Membership.query()
    .where('organizationId', organization.id)
    .whereIn('role', ['owner', 'admin'])
    .preload('user')

  const locale = organization.defaultLocale === 'es' ? 'es' : 'en'
  const usageUrl = `${env.get('WEB_URL')}/app/${organization.slug}/settings/billing`

  for (const membership of memberships) {
    await mail.sendLater(
      new QuotaThreshold({
        email: String(membership.user.email),
        name: membership.user.fullName,
        scope: 'ai',
        threshold,
        used,
        limit,
        usageUrl,
        locale,
      })
    )
  }
}
