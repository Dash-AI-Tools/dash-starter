import type { HttpContext } from '@adonisjs/core/http'
import { supportedLocale } from '#app/locales'
import {
  billingState,
  cancelSubscription,
  changePlan,
  portalLink,
  startCheckout,
} from '#services/billing'
import { changePlanValidator, checkoutValidator, cancelValidator } from '#validators/billing'

export default class BillingController {
  /**
   * The state of the billing of the organization: the plan, the
   * subscription, the usage and the entitlements.
   */
  async show({ organization, bouncer, membership, serialize, i18n }: HttpContext) {
    await bouncer.authorize('manageBilling', membership)

    return serialize.withoutWrapping({
      billing: await billingState(organization, supportedLocale(i18n.locale)),
    })
  }

  /**
   * Starts the checkout of a plan in the payment provider and answers with
   * the URL the user has to visit.
   */
  async checkout(ctx: HttpContext) {
    const { request, auth, organization, bouncer, membership, serialize } = ctx

    await bouncer.authorize('manageBilling', membership)

    const { plan, interval } = await request.validateUsing(checkoutValidator)

    const checkoutUrl = await startCheckout(organization, plan, interval, auth.getUserOrFail())

    return serialize.withoutWrapping({ checkoutUrl })
  }

  /**
   * Moves the subscription to another plan or to another interval.
   */
  async changePlan(ctx: HttpContext) {
    const { request, organization, bouncer, membership, i18n } = ctx

    await bouncer.authorize('manageBilling', membership)

    const { plan, interval } = await request.validateUsing(changePlanValidator)

    await changePlan(organization, plan, interval, i18n)

    return { success: true }
  }

  /**
   * Cancels the subscription, right away or when the period ends.
   */
  async cancel(ctx: HttpContext) {
    const { request, organization, bouncer, membership } = ctx

    await bouncer.authorize('manageBilling', membership)

    const { mode } = await request.validateUsing(cancelValidator)

    await cancelSubscription(organization, mode ?? 'scheduled')

    return { success: true }
  }

  /**
   * The link of the customer portal of the organization.
   */
  async portal({ organization, bouncer, membership, serialize }: HttpContext) {
    await bouncer.authorize('manageBilling', membership)

    return serialize.withoutWrapping({
      portalUrl: await portalLink(organization),
    })
  }
}
