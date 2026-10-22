import env from '#start/env'

/**
 * The base URL of the Creem API. The sandbox is used outside production, so
 * a mistake never charges a real card.
 */
export const CREEM_BASE_URLS = {
  live: 'https://api.creem.io',
  test: 'https://test-api.creem.io',
} as const

/**
 * The environment the client talks to.
 */
export type CreemEnvironment = keyof typeof CREEM_BASE_URLS

/**
 * How the difference of the price is charged when the plan changes.
 */
export type UpdateBehavior = 'proration-charge-immediately' | 'proration-none'

/**
 * The checkout to create.
 */
export type CheckoutInput = {
  /** The product of the payment provider. */
  productId: string
  /** An identifier of the request, so the same checkout is not created twice. */
  requestId: string
  /** The address of the customer, prefilled in the checkout. */
  email: string
  /** The name of the customer, prefilled in the checkout. */
  name?: string
  /** Where the customer lands after the payment. */
  successUrl: string
  /** The data that travels back with the webhook of the subscription. */
  metadata: Record<string, string>
}

/**
 * The product to create in the payment provider.
 */
export type ProductInput = {
  /** The name of the product. */
  name: string
  /** The description of the product. */
  description?: string
  /** The price, in the minor unit of the currency. */
  price: number
  /** The currency of the price. */
  currency: string
  /** How often the product is charged. */
  billingPeriod: 'every-month' | 'every-year'
}

/**
 * The product of the payment provider.
 */
export type CreemProduct = {
  id: string
  price: number
  currency: string
  billing_period: string
}

/**
 * A request to the payment provider that did not succeed.
 */
export class CreemApiError extends Error {
  /** The status the provider answered with. */
  readonly status: number
  /** The body of the answer. */
  readonly payload: unknown

  constructor(status: number, payload: unknown) {
    super(`The payment provider answered with the status ${status}`)
    this.name = 'CreemApiError'
    this.status = status
    this.payload = payload
  }
}

/**
 * The options of the client.
 */
export type CreemClientOptions = {
  /** The key of the store. */
  apiKey: string
  /** The environment the client talks to. */
  environment: CreemEnvironment
  /** The base URL, when it is not the one of the environment. */
  baseUrl?: string
}

/**
 * A thin client of the Creem API.
 *
 * The client only knows how to talk to the provider: the decisions about the
 * plans of the organization live in the billing service.
 */
export class CreemClient {
  /** The options of the client. */
  private options: CreemClientOptions

  constructor(options: CreemClientOptions) {
    this.options = options
  }

  /**
   * The client of the store the environment points at.
   */
  static fromEnv(): CreemClient {
    return new CreemClient({
      apiKey: env.get('CREEM_API_KEY') ?? '',
      environment: env.get('CREEM_ENV'),
    })
  }

  /**
   * The base URL of the API.
   */
  get baseUrl(): string {
    return this.options.baseUrl ?? CREEM_BASE_URLS[this.options.environment]
  }

  /**
   * Creates a checkout and returns the URL the customer has to visit.
   */
  async createCheckout(input: CheckoutInput): Promise<{ id: string; checkoutUrl: string }> {
    const payload = await this.request<{ id: string; checkout_url: string }>(
      'POST',
      '/v1/checkouts',
      {
        product_id: input.productId,
        request_id: input.requestId,
        customer: { email: input.email, ...(input.name ? { name: input.name } : {}) },
        success_url: input.successUrl,
        metadata: input.metadata,
      }
    )

    return { id: payload.id, checkoutUrl: payload.checkout_url }
  }

  /**
   * Creates the link of the customer portal, where the invoices and the
   * payment methods live.
   */
  async createPortalLink(customerId: string): Promise<string> {
    const payload = await this.request<{ customer_portal_link: string }>(
      'POST',
      '/v1/customers/billing',
      { customer_id: customerId }
    )

    return payload.customer_portal_link
  }

  /**
   * Cancels a subscription, right away or when the period ends.
   */
  async cancelSubscription(id: string, mode: 'immediate' | 'scheduled'): Promise<void> {
    await this.request('POST', `/v1/subscriptions/${id}/cancel`, { mode })
  }

  /**
   * Moves a subscription to another product.
   */
  async changeSubscriptionProduct(
    id: string,
    productId: string,
    updateBehavior: UpdateBehavior
  ): Promise<void> {
    await this.request('POST', `/v1/subscriptions/${id}/upgrade`, {
      product_id: productId,
      update_behavior: updateBehavior,
    })
  }

  /**
   * Creates a product in the payment provider.
   */
  async createProduct(input: ProductInput): Promise<CreemProduct> {
    const payload = await this.request<CreemProduct>('POST', '/v1/products', {
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      price: input.price,
      currency: input.currency,
      billing_type: 'recurring',
      billing_period: input.billingPeriod,
    })

    return payload
  }

  /**
   * Reads a product of the payment provider.
   */
  async getProduct(id: string): Promise<CreemProduct> {
    return this.request<CreemProduct>('GET', `/v1/products/${id}`)
  }

  /**
   * Sends a request to the API and returns the parsed answer.
   */
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'x-api-key': this.options.apiKey,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    const text = await response.text()
    const payload = this.parse(text)

    if (!response.ok) {
      throw new CreemApiError(response.status, payload)
    }

    return payload as T
  }

  /**
   * Reads the answer of the API, which is JSON most of the time.
   */
  private parse(text: string): unknown {
    if (!text) {
      return {}
    }

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
}
