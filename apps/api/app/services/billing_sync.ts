import PlanPrice from '#models/plan_price'
import type { PlanInterval } from '#models/plan_price'
import { CreemApiError } from '#services/creem'
import type { CreemClient, CreemProduct } from '#services/creem'

/**
 * A product that was created in the payment provider.
 */
export type CreatedProduct = {
  /** The key of the plan the price belongs to. */
  planKey: string
  /** The interval the price is paid with. */
  interval: PlanInterval
  /** The identifier of the product in the payment provider. */
  productId: string
}

/**
 * A price that does not match the product of the payment provider.
 */
export type PriceDrift = {
  /** The key of the plan the price belongs to. */
  planKey: string
  /** The interval the price is paid with. */
  interval: PlanInterval
  /** The amount the database has. */
  expectedCents: number
  /** The amount the payment provider has. */
  foundCents: number
  /** The period the provider charges with, when it is not the one of the price. */
  foundPeriod?: string
}

/**
 * What the synchronization found.
 */
export type SyncReport = {
  /** The products that were created. */
  created: CreatedProduct[]
  /** The prices that do not match the payment provider. */
  drift: PriceDrift[]
  /** The prices that need no product, because they cost nothing. */
  skipped: number
}

/**
 * Creates the products of the payment provider that the prices of the
 * catalog need, and reports the prices that do not match the product they
 * point at.
 *
 * The prices that cost nothing are left alone: the free plan is not sold.
 */
export async function syncProducts(creem: CreemClient): Promise<SyncReport> {
  const prices = await PlanPrice.query()
    .where('isActive', true)
    .preload('plan')
    .orderBy('planId', 'asc')
    .orderBy('interval', 'asc')

  const report: SyncReport = { created: [], drift: [], skipped: 0 }

  for (const price of prices) {
    if (price.amountCents === 0) {
      report.skipped++
      continue
    }

    const product = price.creemProductId ? await findProduct(creem, price.creemProductId) : null

    if (!product) {
      const created = await createProduct(creem, price)

      price.creemProductId = created.id
      await price.save()

      report.created.push({
        planKey: price.plan.key,
        interval: price.interval,
        productId: created.id,
      })

      continue
    }

    const expectedPeriod = price.interval === 'year' ? 'every-year' : 'every-month'

    if (product.price !== price.amountCents || product.billing_period !== expectedPeriod) {
      report.drift.push({
        planKey: price.plan.key,
        interval: price.interval,
        expectedCents: price.amountCents,
        foundCents: product.price,
        ...(product.billing_period !== expectedPeriod
          ? { foundPeriod: product.billing_period }
          : {}),
      })
    }
  }

  return report
}

/**
 * Reads a product of the payment provider. A product that is not there is
 * missing, not broken: the sync creates it again.
 */
async function findProduct(creem: CreemClient, id: string): Promise<CreemProduct | null> {
  try {
    return await creem.getProduct(id)
  } catch (error) {
    if (error instanceof CreemApiError && error.status === 404) {
      return null
    }

    throw error
  }
}

/**
 * Creates the product of a price in the payment provider.
 */
async function createProduct(creem: CreemClient, price: PlanPrice): Promise<CreemProduct> {
  return creem.createProduct({
    name: `${price.plan.name.en} (${price.interval === 'year' ? 'yearly' : 'monthly'})`,
    description: price.plan.description.en,
    price: price.amountCents,
    currency: price.currency,
    billingPeriod: price.interval === 'year' ? 'every-year' : 'every-month',
  })
}
