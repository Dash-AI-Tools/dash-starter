import PlanPrice from '#models/plan_price'
import { CreemApiError, CreemClient } from '#services/creem'
import type { CheckoutInput, CreemProduct, ProductInput, UpdateBehavior } from '#services/creem'
import { seedPlans } from '#services/plans'
import app from '@adonisjs/core/services/app'

/**
 * A payment provider that lives in memory.
 *
 * The client records what it was asked to do, so the tests can check that the
 * application talks to the provider the way it is supposed to.
 */
export class FakeCreemClient extends CreemClient {
  /** The checkouts that were created. */
  checkouts: CheckoutInput[] = []
  /** The products that were created. */
  products: ProductInput[] = []
  /** The subscriptions that were canceled. */
  cancellations: { id: string; mode: 'immediate' | 'scheduled' }[] = []
  /** The subscriptions that were moved to another product. */
  changes: { id: string; productId: string; behavior: UpdateBehavior }[] = []
  /** The customers a portal link was created for. */
  portals: string[] = []
  /** The products the provider knows, by identifier. */
  known = new Map<string, CreemProduct>()

  constructor() {
    super({ apiKey: 'fake', environment: 'test' })
  }

  async createCheckout(input: CheckoutInput) {
    this.checkouts.push(input)

    return {
      id: `checkout_${this.checkouts.length}`,
      checkoutUrl: `https://checkout.test/${input.productId}`,
    }
  }

  async createPortalLink(customerId: string) {
    this.portals.push(customerId)

    return `https://portal.test/${customerId}`
  }

  async cancelSubscription(id: string, mode: 'immediate' | 'scheduled') {
    this.cancellations.push({ id, mode })
  }

  async changeSubscriptionProduct(id: string, productId: string, updateBehavior: UpdateBehavior) {
    this.changes.push({ id, productId, behavior: updateBehavior })
  }

  async createProduct(input: ProductInput) {
    this.products.push(input)

    const product: CreemProduct = {
      id: `prod_${this.products.length}`,
      price: input.price,
      currency: input.currency,
      billing_period: input.billingPeriod,
    }

    this.known.set(product.id, product)

    return product
  }

  async getProduct(id: string) {
    const product = this.known.get(id)

    if (!product) {
      throw new CreemApiError(404, { message: 'The product was not found' })
    }

    return product
  }

  /**
   * Makes the provider know a product, as if it had been created before.
   */
  addProduct(
    id: string,
    price: number,
    billingPeriod: 'every-month' | 'every-year' = 'every-month'
  ) {
    this.known.set(id, { id, price, currency: 'USD', billing_period: billingPeriod })
  }
}

/**
 * Replaces the client of the payment provider with a fake, and gives it back
 * to the container when the test ends.
 */
export function useFakeCreem(): FakeCreemClient {
  const fake = new FakeCreemClient()

  app.container.swap(CreemClient, () => fake)

  return fake
}

/**
 * Puts the real client back in the container.
 */
export function restoreCreem() {
  app.container.restore(CreemClient)
}

/**
 * Writes the catalog of plans to the database and points the prices that cost
 * something at a product of the payment provider.
 */
export async function seedCatalog(): Promise<void> {
  await seedPlans()

  const prices = await PlanPrice.query().where('amountCents', '>', 0).preload('plan')

  for (const price of prices) {
    price.creemProductId = `prod_${price.plan.key}_${price.interval}`
    await price.save()
  }
}
