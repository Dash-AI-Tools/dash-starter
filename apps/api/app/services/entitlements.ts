import { E_NO_DEFAULT_PLAN } from '#exceptions/errors'
import Plan from '#models/plan'
import type { Entitlements } from '#models/plan'
import type Organization from '#models/organization'
import Subscription from '#models/subscription'
import { DateTime } from 'luxon'

/**
 * The days the organization keeps the access after a failed payment.
 */
export const GRACE_PERIOD_DAYS = 7

/**
 * The limits of the plan of an organization.
 *
 * This service is the only reader of the limits: the rest of the code asks
 * for the entitlements of an organization and never looks at the plan itself.
 * A limit of `-1` means that the feature is not limited.
 */
export class EntitlementService {
  /**
   * The plan the organization has: the one of its subscription while the
   * subscription is active, trialing or inside the grace period of a failed
   * payment, and the free plan otherwise.
   */
  static async for(organization: Organization): Promise<Plan> {
    const subscription = await Subscription.query()
      .where('organizationId', organization.id)
      .preload('planPrice', (query) => query.preload('plan'))
      .first()

    if (subscription && this.hasAccess(subscription)) {
      const plan = subscription.planPrice?.plan

      if (plan && plan.isActive) {
        return plan
      }
    }

    return this.freePlan()
  }

  /**
   * The limits of the organization.
   */
  static async limits(organization: Organization): Promise<Entitlements> {
    const plan = await this.for(organization)
    return plan.entitlements
  }

  /**
   * Whether a usage fits in a limit of the plan.
   *
   * A limit of `-1` means that the feature is not limited, so it always fits.
   */
  static allows(limit: number, used: number): boolean {
    return limit < 0 || used <= limit
  }

  /**
   * Whether the subscription still gives access to the paid plan.
   */
  private static hasAccess(subscription: Subscription): boolean {
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      return true
    }

    /**
     * A failed payment does not take the access away right away: the
     * organization keeps it until the grace period is over.
     */
    if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      return !!subscription.graceUntil && subscription.graceUntil > DateTime.now()
    }

    return false
  }

  /**
   * The plan every organization without a paid subscription has.
   */
  private static async freePlan(): Promise<Plan> {
    const plan = await Plan.query().where('isDefaultFree', true).where('isActive', true).first()

    if (!plan) {
      throw new E_NO_DEFAULT_PLAN()
    }

    return plan
  }
}
