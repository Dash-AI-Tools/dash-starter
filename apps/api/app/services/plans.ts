import Plan from '#models/plan'
import type { Entitlements, LocalizedFeatures, LocalizedText } from '#models/plan'
import PlanPrice from '#models/plan_price'
import type { PlanInterval } from '#models/plan_price'
import db from '@adonisjs/lucid/services/db'

/**
 * A plan of the catalog, as it is written to the database.
 */
export type PlanSeed = {
  /** The stable identifier of the plan. */
  key: string
  /** The name of the plan, in every supported language. */
  name: LocalizedText
  /** The description of the plan, in every supported language. */
  description: LocalizedText
  /** The bullets of the pricing page, in every supported language. */
  features: LocalizedFeatures
  /** The limits the plan gives to the organization. */
  entitlements: Entitlements
  /** Whether this is the plan every organization starts with. */
  isDefaultFree: boolean
  /** The order of the plan in the pricing page. */
  sortOrder: number
  /**
   * The prices of the plan, one per interval. A price that costs something
   * names the product of the payment provider.
   */
  prices: {
    interval: PlanInterval
    amountCents: number
    currency: string
    creemProductId?: string
  }[]
}

/**
 * The plans the template ships with.
 *
 * The amounts and the product ids are placeholders: the product owner
 * replaces them with the real ones, either here before the first deploy or
 * in the database afterwards. The command `node ace billing:sync` creates the
 * products of the payment provider and writes their ids on the prices.
 */
export const PLAN_CATALOG: PlanSeed[] = [
  {
    key: 'free',
    name: { en: 'Free', es: 'Gratis' },
    description: {
      en: 'Everything you need to try the product with your team.',
      es: 'Todo lo necesario para probar el producto con tu equipo.',
    },
    features: {
      en: ['Up to 3 seats', '100 AI credits every month', 'Community support'],
      es: ['Hasta 3 puestos', '100 créditos de IA cada mes', 'Soporte de la comunidad'],
    },
    entitlements: {
      seats: 3,
      aiCredits: 100,
      mcpEnabled: false,
      mcpCalls: 0,
      mcpRpm: 0,
    },
    isDefaultFree: true,
    sortOrder: 10,
    prices: [
      { interval: 'month', amountCents: 0, currency: 'USD' },
      { interval: 'year', amountCents: 0, currency: 'USD' },
    ],
  },
  {
    key: 'pro',
    name: { en: 'Pro', es: 'Pro' },
    description: {
      en: 'For teams that need the AI and the API in their day to day.',
      es: 'Para equipos que necesitan la IA y la API en su día a día.',
    },
    features: {
      en: ['Up to 10 seats', '1000 AI credits every month', 'MCP server access', 'Email support'],
      es: [
        'Hasta 10 puestos',
        '1000 créditos de IA cada mes',
        'Acceso al servidor MCP',
        'Soporte por correo',
      ],
    },
    entitlements: {
      seats: 10,
      aiCredits: 1000,
      mcpEnabled: true,
      mcpCalls: 1000,
      mcpRpm: 30,
    },
    isDefaultFree: false,
    sortOrder: 20,
    prices: [
      {
        interval: 'month',
        amountCents: 1900,
        currency: 'USD',
        creemProductId: 'prod_pro_month',
      },
      {
        interval: 'year',
        amountCents: 19000,
        currency: 'USD',
        creemProductId: 'prod_pro_year',
      },
    ],
  },
  {
    key: 'business',
    name: { en: 'Business', es: 'Business' },
    description: {
      en: 'For organizations that need more seats, more usage and more control.',
      es: 'Para organizaciones que necesitan más puestos, más uso y más control.',
    },
    features: {
      en: [
        'Up to 50 seats',
        '5000 AI credits every month',
        'MCP server access',
        'Priority support',
      ],
      es: [
        'Hasta 50 puestos',
        '5000 créditos de IA cada mes',
        'Acceso al servidor MCP',
        'Soporte prioritario',
      ],
    },
    entitlements: {
      seats: 50,
      aiCredits: 5000,
      mcpEnabled: true,
      mcpCalls: 10000,
      mcpRpm: 60,
    },
    isDefaultFree: false,
    sortOrder: 30,
    prices: [
      {
        interval: 'month',
        amountCents: 4900,
        currency: 'USD',
        creemProductId: 'prod_business_month',
      },
      {
        interval: 'year',
        amountCents: 49000,
        currency: 'USD',
        creemProductId: 'prod_business_year',
      },
    ],
  },
]

/**
 * Writes the catalog of plans to the database.
 *
 * The seeder can be run as many times as needed: the plans and the prices are
 * looked up by their key, so a second run updates the content instead of
 * creating a copy. A price that changes is written as a new price, and the
 * old one is deactivated, so the subscribers keep the price they signed up
 * with.
 */
export async function seedPlans(): Promise<void> {
  const freeKey = PLAN_CATALOG.find((plan) => plan.isDefaultFree)?.key

  await db.transaction(async () => {
    /**
     * The database accepts a single free plan, so the flag is taken away from
     * the plans that are not the one of the catalog before it is given to it.
     */
    if (freeKey) {
      await Plan.query().whereNot('key', freeKey).update({ isDefaultFree: false })
    }

    for (const seed of PLAN_CATALOG) {
      await savePlan(seed)
    }
  })
}

/**
 * Writes one plan of the catalog, with its prices.
 */
async function savePlan(seed: PlanSeed): Promise<void> {
  const plan = await Plan.query().where('key', seed.key).first()

  if (!plan) {
    await Plan.create({
      key: seed.key,
      name: seed.name,
      description: seed.description,
      features: seed.features,
      entitlements: seed.entitlements,
      isPublic: true,
      isActive: true,
      isDefaultFree: seed.isDefaultFree,
      sortOrder: seed.sortOrder,
    })
  } else {
    plan.name = seed.name
    plan.description = seed.description
    plan.features = seed.features
    plan.entitlements = seed.entitlements
    plan.isPublic = true
    plan.isActive = true
    plan.isDefaultFree = seed.isDefaultFree
    plan.sortOrder = seed.sortOrder
    await plan.save()
  }

  for (const price of seed.prices) {
    await savePrice(seed.key, price)
  }
}

/**
 * Writes one price of the catalog. A price that changed becomes a new row,
 * and the old one stops being active.
 */
async function savePrice(
  planKey: string,
  price: {
    interval: PlanInterval
    amountCents: number
    currency: string
    creemProductId?: string
  }
): Promise<void> {
  const plan = await Plan.query().where('key', planKey).firstOrFail()
  const current = await PlanPrice.query()
    .where('planId', plan.id)
    .where('interval', price.interval)
    .where('isActive', true)
    .first()

  /**
   * The product the owner configured wins: the placeholder of the catalog
   * only fills the gap of a price that has none.
   */
  const productId = current?.creemProductId ?? price.creemProductId ?? null

  if (!current) {
    await PlanPrice.create({
      planId: plan.id,
      interval: price.interval,
      amountCents: price.amountCents,
      currency: price.currency,
      creemProductId: productId,
      isActive: true,
    })
    return
  }

  if (current.amountCents === price.amountCents && current.currency === price.currency) {
    if (current.creemProductId !== productId) {
      current.creemProductId = productId
      await current.save()
    }
    return
  }

  /**
   * The old price is kept as it is: the subscriptions that hold it keep
   * paying the amount they signed up with.
   */
  current.isActive = false
  await current.save()

  await PlanPrice.create({
    planId: plan.id,
    interval: price.interval,
    amountCents: price.amountCents,
    currency: price.currency,
    creemProductId: productId,
    isActive: true,
  })
}

/**
 * The plans the pricing page shows: the active ones, the public ones, with
 * their active prices.
 */
export async function publicPlans(): Promise<Plan[]> {
  return Plan.query()
    .where('isActive', true)
    .where('isPublic', true)
    .preload('prices', (query) => query.where('isActive', true))
    .orderBy('sortOrder', 'asc')
}

/**
 * The price of a plan for an interval, when the plan has one and it is
 * active.
 */
export async function activePrice(
  planKey: string,
  interval: PlanInterval
): Promise<PlanPrice | null> {
  return PlanPrice.query()
    .where('interval', interval)
    .where('isActive', true)
    .preload('plan')
    .whereHas('plan', (query) => query.where('key', planKey).where('isActive', true))
    .first()
}
