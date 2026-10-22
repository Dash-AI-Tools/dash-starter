import { randomUUID } from 'node:crypto'
import { E_NO_SUBSCRIPTION, E_PLAN_UNAVAILABLE, E_SUBSCRIPTION_EXISTS } from '#exceptions/errors'
import type Organization from '#models/organization'
import type PlanPrice from '#models/plan_price'
import type { PlanInterval } from '#models/plan_price'
import Subscription from '#models/subscription'
import type { SubscriptionStatus } from '#models/subscription'
import type User from '#models/user'
import { CreemClient } from '#services/creem'
import { EntitlementService } from '#services/entitlements'
import { usedSeats } from '#services/organizations'
import { activePrice } from '#services/plans'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import type { I18n } from '@adonisjs/i18n'
import { errors as VineErrors } from '@vinejs/vine'

/**
 * The statuses in which the organization already pays for a plan. A new
 * checkout is refused while one of them is the current one.
 */
const PAID_STATUSES: SubscriptionStatus[] = ['active', 'trialing', 'past_due', 'unpaid']

/**
 * Starts the checkout of a plan and returns the URL of the payment provider.
 *
 * The checkout carries the organization and the price in its metadata, so the
 * webhook that confirms the payment knows what to activate.
 */
export async function startCheckout(
  organization: Organization,
  planKey: string,
  interval: PlanInterval,
  user: User
): Promise<string> {
  const subscription = await Subscription.query().where('organizationId', organization.id).first()

  if (subscription && PAID_STATUSES.includes(subscription.status)) {
    throw new E_SUBSCRIPTION_EXISTS()
  }

  const price = await priceFor(planKey, interval)

  const creem = await app.container.make(CreemClient)
  const checkout = await creem.createCheckout({
    productId: price.creemProductId!,
    requestId: randomUUID(),
    email: user.email,
    name: user.fullName,
    successUrl: `${env.get('WEB_URL')}/app/${organization.slug}/settings/billing?checkout=success`,
    metadata: {
      organizationId: String(organization.id),
      planPriceId: String(price.id),
    },
  })

  return checkout.checkoutUrl
}

/**
 * Moves the subscription of the organization to another price.
 *
 * A change that leaves the organization with more members than the new plan
 * has seats for is refused, and the answer names how many members have to
 * leave first.
 */
export async function changePlan(
  organization: Organization,
  planKey: string,
  interval: PlanInterval,
  i18n: I18n
): Promise<void> {
  const subscription = await subscriptionOf(organization)
  const price = await priceFor(planKey, interval)
  const target = price.plan

  const seats = await usedSeats(organization)
  const limit = target.entitlements.seats

  if (!EntitlementService.allows(limit, seats)) {
    throw new VineErrors.E_VALIDATION_ERROR([
      {
        field: 'plan',
        message: i18n.t('errors.downgrade_blocked', {
          count: seats - limit,
          plan: target.name[localeOf(organization)],
        }),
        rule: 'downgrade_blocked',
      },
    ])
  }

  const current = subscription.planPrice
  const creem = await app.container.make(CreemClient)

  await creem.changeSubscriptionProduct(
    subscription.creemSubscriptionId!,
    price.creemProductId!,
    current && price.amountCents > current.amountCents
      ? 'proration-charge-immediately'
      : 'proration-none'
  )
}

/**
 * Cancels the subscription of the organization, right away or when the
 * current period ends.
 */
export async function cancelSubscription(
  organization: Organization,
  mode: 'immediate' | 'scheduled'
): Promise<void> {
  const subscription = await subscriptionOf(organization)
  const creem = await app.container.make(CreemClient)

  await creem.cancelSubscription(subscription.creemSubscriptionId!, mode)
}

/**
 * The link of the customer portal, where the invoices and the payment
 * methods live.
 */
export async function portalLink(organization: Organization): Promise<string> {
  const subscription = await subscriptionOf(organization)

  if (!subscription.creemCustomerId) {
    throw new E_NO_SUBSCRIPTION()
  }

  const creem = await app.container.make(CreemClient)
  return creem.createPortalLink(subscription.creemCustomerId)
}

/**
 * The state of the billing of the organization, as the billing page shows it.
 */
export async function billingState(organization: Organization) {
  const plan = await EntitlementService.for(organization)
  const subscription = await Subscription.query()
    .where('organizationId', organization.id)
    .preload('planPrice', (query) => query.preload('plan'))
    .first()

  const seats = await usedSeats(organization)

  return {
    plan: {
      key: plan.key,
      name: plan.name[localeOf(organization)],
      description: plan.description[localeOf(organization)],
      entitlements: plan.entitlements,
    },
    subscription: subscription
      ? {
          status: subscription.status,
          interval: subscription.planPrice?.interval ?? null,
          amountCents: subscription.planPrice?.amountCents ?? null,
          currency: subscription.planPrice?.currency ?? null,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          graceUntil: subscription.graceUntil,
        }
      : null,
    usage: {
      seats,
      /**
       * The counters of the AI and of the MCP arrive with the groups that
       * spend them, so they are read as zero until then.
       */
      aiCredits: 0,
      mcpCalls: 0,
    },
  }
}

/**
 * The subscription of the organization, which has to exist and to be known
 * by the payment provider.
 */
async function subscriptionOf(organization: Organization): Promise<Subscription> {
  const subscription = await Subscription.query()
    .where('organizationId', organization.id)
    .preload('planPrice', (query) => query.preload('plan'))
    .first()

  if (!subscription?.creemSubscriptionId) {
    throw new E_NO_SUBSCRIPTION()
  }

  return subscription
}

/**
 * The price of a plan, which has to be active and to have a product in the
 * payment provider.
 */
async function priceFor(planKey: string, interval: PlanInterval): Promise<PlanPrice> {
  const price = await activePrice(planKey, interval)

  if (!price?.creemProductId) {
    throw new E_PLAN_UNAVAILABLE()
  }

  return price
}

/**
 * The language the billing page and the billing emails of the organization
 * are written in.
 */
function localeOf(organization: Organization): 'en' | 'es' {
  return organization.defaultLocale === 'es' ? 'es' : 'en'
}
