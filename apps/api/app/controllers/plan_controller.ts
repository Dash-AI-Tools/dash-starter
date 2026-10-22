import { publicPlans } from '#services/plans'
import { supportedLocale } from '#app/locales'
import type { HttpContext } from '@adonisjs/core/http'

export default class PlanController {
  /**
   * The plans of the catalog, with their prices and their entitlements.
   *
   * The endpoint is public: the pricing page and the setup of a new
   * organization read it before the visitor has an account.
   */
  async index({ i18n, serialize }: HttpContext) {
    const locale = supportedLocale(i18n.locale)
    const plans = await publicPlans()

    return serialize.withoutWrapping({
      plans: plans.map((plan) => ({
        key: plan.key,
        name: plan.name[locale],
        description: plan.description[locale],
        features: plan.features[locale],
        isDefaultFree: plan.isDefaultFree,
        entitlements: plan.entitlements,
        prices: plan.prices.map((price) => ({
          id: price.id,
          interval: price.interval,
          amountCents: price.amountCents,
          currency: price.currency,
        })),
      })),
    })
  }
}
