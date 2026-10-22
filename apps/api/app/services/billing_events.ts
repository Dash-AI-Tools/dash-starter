import { createHmac, timingSafeEqual } from 'node:crypto'
import BillingEvent from '#models/billing_event'
import Organization from '#models/organization'
import Membership from '#models/membership'
import PlanPrice from '#models/plan_price'
import Subscription from '#models/subscription'
import type { SubscriptionStatus } from '#models/subscription'
import PaymentFailed from '#mails/payment_failed'
import SubscriptionCanceled from '#mails/subscription_canceled'
import SubscriptionStarted from '#mails/subscription_started'
import { GRACE_PERIOD_DAYS } from '#services/entitlements'
import env from '#start/env'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import mail from '@adonisjs/mail/services/main'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * The event the payment provider sends. Only the fields the application
 * reads are described here.
 */
export type CreemEvent = {
  /** The identifier of the event, unique in the provider. */
  id: string
  /** The kind of the event, for example `subscription.paid`. */
  eventType: string
  /** When the event happened, in milliseconds since the epoch. */
  created_at: number
  /** The object the event is about. */
  object: {
    id?: string
    product?: string | { id: string }
    customer?: string | { id: string; email?: string; name?: string }
    status?: string
    current_period_end_date?: string
    canceled_at?: string | null
    metadata?: Record<string, string>
    subscription?: {
      id?: string
      product?: string | { id: string }
      customer?: string | { id: string; email?: string; name?: string }
      status?: string
      current_period_end_date?: string
      canceled_at?: string | null
      metadata?: Record<string, string>
    }
  }
}

/**
 * The state the subscription moves to, and the one it comes from.
 */
export type Transition = {
  event: CreemEvent
  status: SubscriptionStatus
  previousStatus: SubscriptionStatus | null
  organization: Organization
  planName: string
  amount: number
  currency: string
  renewsAt?: Date
}

/**
 * The state a subscription has after each kind of event.
 */
const EVENT_STATUSES: Record<string, SubscriptionStatus> = {
  'checkout.completed': 'active',
  'subscription.active': 'active',
  'subscription.paid': 'active',
  'subscription.trialing': 'trialing',
  'subscription.past_due': 'past_due',
  'subscription.unpaid': 'unpaid',
  'subscription.scheduled_cancel': 'active',
  'subscription.canceled': 'canceled',
  'subscription.expired': 'expired',
  'subscription.paused': 'paused',
}

/**
 * Checks the signature of a webhook against the raw body it was signed with.
 */
export function verifySignature(
  rawBody: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const given = Buffer.from(signature, 'utf8')
  const computed = Buffer.from(expected, 'utf8')

  if (given.length !== computed.length) {
    return false
  }

  return timingSafeEqual(given, computed)
}

/**
 * Processes an event of the payment provider.
 *
 * The event is recorded before it is applied, so the same event delivered
 * twice changes nothing. The state of the subscription is updated inside a
 * transaction, and the events that arrive out of order are ignored.
 */
export async function processEvent(
  event: CreemEvent
): Promise<'applied' | 'duplicate' | 'ignored'> {
  const outcome = await db.transaction(async (trx) => {
    const recorded = await recordEvent(event, trx)

    if (!recorded) {
      return { kind: 'duplicate' as const }
    }

    const transition = await applyEvent(event, trx)

    if (!transition) {
      await markProcessed(event.id, trx)
      return { kind: 'ignored' as const }
    }

    await markProcessed(event.id, trx)

    return { kind: 'applied' as const, transition }
  })

  /**
   * The emails travel once the state is committed, so a message never
   * announces a change that did not happen.
   */
  if (outcome.kind === 'applied') {
    await notify(outcome.transition)
  }

  return outcome.kind
}

/**
 * Records the event, so it is never applied twice.
 *
 * An event that is already recorded and applied is a duplicate. An event that
 * was recorded but not applied — because the application died in the middle
 * of it — is applied again, so a delivery is never lost.
 *
 * shortcut: two deliveries of the same event that arrive at the same instant
 * make one of them fail with the unique index; the payment provider repeats
 * the delivery and it is answered as a duplicate.
 */
async function recordEvent(event: CreemEvent, trx: TransactionClientContract): Promise<boolean> {
  const existing = await BillingEvent.query({ client: trx })
    .where('providerEventId', event.id)
    .first()

  if (existing?.processedAt) {
    return false
  }

  if (!existing) {
    await BillingEvent.create(
      {
        providerEventId: event.id,
        type: event.eventType,
        payload: event as unknown as Record<string, unknown>,
      },
      { client: trx }
    )
  }

  return true
}

/**
 * Marks the event as applied.
 */
async function markProcessed(
  providerEventId: string,
  trx: TransactionClientContract
): Promise<void> {
  await BillingEvent.query({ client: trx })
    .where('providerEventId', providerEventId)
    .update({ processedAt: DateTime.now() })
}

/**
 * Applies the event to the subscription of the organization.
 *
 * The subscription row is locked while it is read, so two events that arrive
 * at the same time do not overwrite each other.
 */
async function applyEvent(
  event: CreemEvent,
  trx: TransactionClientContract
): Promise<Transition | null> {
  const subject = event.object.subscription ?? event.object
  const metadata = subject.metadata ?? event.object.metadata ?? {}
  const organizationId = Number(metadata.organizationId)

  /**
   * An event that does not carry the organization cannot be applied: it
   * belongs to a store that is not this one.
   */
  if (!organizationId) {
    return null
  }

  const organization = await Organization.query().where('id', organizationId).first()
  if (!organization) {
    return null
  }

  const subscription = await Subscription.query({ client: trx })
    .where('organizationId', organizationId)
    .forUpdate()
    .first()

  /**
   * The event is older than the last one that was applied, so the state of
   * the subscription is already newer.
   */
  const lastEventAt = subscription?.lastEventAt
  if (lastEventAt && event.created_at < lastEventAt.toMillis()) {
    return null
  }

  const status = statusOf(event, subscription)
  const previousStatus = subscription?.status ?? null
  const productId = productIdOf(subject)
  const price = productId
    ? await PlanPrice.query({ client: trx })
        .where('creemProductId', productId)
        .preload('plan')
        .first()
    : null

  const customerId = customerIdOf(subject)
  const periodEnd = subject.current_period_end_date
    ? DateTime.fromISO(subject.current_period_end_date)
    : null

  const graceUntil =
    status === 'past_due' || status === 'unpaid'
      ? DateTime.fromMillis(event.created_at).plus({ days: GRACE_PERIOD_DAYS })
      : null

  const cancelAtPeriodEnd = event.eventType === 'subscription.scheduled_cancel'

  if (subscription) {
    subscription.status = status
    subscription.planPriceId = price?.id ?? subscription.planPriceId
    subscription.creemSubscriptionId = subject.id ?? subscription.creemSubscriptionId
    subscription.creemCustomerId = customerId ?? subscription.creemCustomerId
    subscription.currentPeriodEnd = periodEnd ?? subscription.currentPeriodEnd
    subscription.cancelAtPeriodEnd = cancelAtPeriodEnd
    subscription.graceUntil = graceUntil
    subscription.lastEventAt = DateTime.fromMillis(event.created_at)
    subscription.useTransaction(trx)
    await subscription.save()
  } else {
    await Subscription.create(
      {
        organizationId: organization.id,
        planPriceId: price?.id ?? null,
        creemSubscriptionId: subject.id ?? null,
        creemCustomerId: customerId ?? null,
        status,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd,
        graceUntil,
        lastEventAt: DateTime.fromMillis(event.created_at),
      },
      { client: trx }
    )
  }

  const plan = price?.plan

  return {
    event,
    status,
    previousStatus,
    organization,
    planName: plan ? plan.name[localeOf(organization)] : '',
    amount: price ? price.amountCents / 100 : 0,
    currency: price?.currency ?? 'USD',
    renewsAt: periodEnd ? periodEnd.toJSDate() : undefined,
  }
}

/**
 * The state the subscription has after the event.
 */
function statusOf(event: CreemEvent, subscription: Subscription | null): SubscriptionStatus {
  const mapped = EVENT_STATUSES[event.eventType]

  if (mapped) {
    return mapped
  }

  /**
   * An update of the subscription keeps the state it had, unless the payload
   * names another one.
   */
  const status = event.object.status ?? subscription?.status
  return (status as SubscriptionStatus) ?? 'active'
}

/**
 * The identifier of the product of the payment provider.
 */
function productIdOf(subject: CreemEvent['object']): string | null {
  const product = subject.product
  if (!product) return null
  return typeof product === 'string' ? product : product.id
}

/**
 * The identifier of the customer of the payment provider.
 */
function customerIdOf(subject: CreemEvent['object']): string | null {
  const customer = subject.customer
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

/**
 * The language the billing emails of the organization are written in.
 */
function localeOf(organization: Organization): 'en' | 'es' {
  return organization.defaultLocale === 'es' ? 'es' : 'en'
}

/**
 * Sends the email of the transition, to the people that manage the
 * organization.
 */
async function notify(transition: Transition): Promise<void> {
  const email = await billingEmail(transition)
  if (!email) {
    return
  }

  const locale = localeOf(transition.organization)
  const manageUrl = `${env.get('WEB_URL')}/app/${transition.organization.slug}/settings/billing`

  if (transition.status === 'active' && transition.previousStatus !== 'active') {
    await mail.sendLater(
      new SubscriptionStarted({
        email: email.email,
        name: email.name,
        planName: transition.planName,
        amount: transition.amount,
        currency: transition.currency,
        renewsAt: transition.renewsAt,
        manageUrl,
        locale,
      })
    )
    return
  }

  if (transition.status === 'past_due' || transition.status === 'unpaid') {
    await mail.sendLater(
      new PaymentFailed({
        email: email.email,
        name: email.name,
        planName: transition.planName,
        amount: transition.amount,
        currency: transition.currency,
        renewsAt: transition.renewsAt,
        manageUrl,
        locale,
      })
    )
    return
  }

  if (transition.status === 'canceled') {
    await mail.sendLater(
      new SubscriptionCanceled({
        email: email.email,
        name: email.name,
        planName: transition.planName,
        plansUrl: `${env.get('WEB_URL')}/pricing`,
        locale,
      })
    )
  }
}

/**
 * The address the billing emails travel to: the owner of the organization.
 */
async function billingEmail(
  transition: Transition
): Promise<{ email: string; name: string } | null> {
  const membership = await Membership.query()
    .where('organizationId', transition.organization.id)
    .whereIn('role', ['owner', 'admin'])
    .preload('user')
    .orderBy('role', 'asc')
    .first()

  if (!membership) {
    return null
  }

  return { email: String(membership.user.email), name: membership.user.fullName }
}
