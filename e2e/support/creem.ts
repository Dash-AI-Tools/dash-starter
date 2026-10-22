import { createHmac } from 'node:crypto'
import { expect, type APIRequestContext } from '@playwright/test'

/**
 * The secret the API signs the webhooks of the payment provider with. It is
 * the one the Compose override of the end-to-end stack sets.
 */
const SECRET = process.env.E2E_CREEM_WEBHOOK_SECRET ?? 'e2e-webhook-secret'

/**
 * The product of the paid plan of the catalog, as the payment provider would
 * name it.
 */
export const PRO_PRODUCT_ID = 'prod_pro_month'

/**
 * The event that confirms a payment, signed the way the payment provider
 * signs it.
 */
export type PaidEvent = {
  /** The organization the subscription belongs to. */
  organizationId: number
  /** The address of the customer. */
  email: string
  /** The product that was paid for. */
  productId?: string
}

/**
 * Sends the event that activates the subscription of an organization.
 *
 * The signature is the HMAC of the raw body, so the API accepts the event
 * exactly as it would accept the one of the real provider.
 */
export async function activateSubscription(
  request: APIRequestContext,
  event: PaidEvent
): Promise<void> {
  const body = JSON.stringify({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    eventType: 'subscription.paid',
    created_at: Date.now(),
    object: {
      id: `sub_${Date.now()}`,
      product: event.productId ?? PRO_PRODUCT_ID,
      customer: { id: `cus_${Date.now()}`, email: event.email },
      status: 'active',
      current_period_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: { organizationId: String(event.organizationId) },
    },
  })

  const response = await request.post('/api/v1/webhooks/creem', {
    headers: {
      'content-type': 'application/json',
      'creem-signature': createHmac('sha256', SECRET).update(body).digest('hex'),
    },
    data: body,
  })

  expect(response.status()).toBe(200)
}

/**
 * The answer of a tool of the MCP server.
 */
export type ToolAnswer = {
  result?: {
    content: { type: string; text: string }[]
    isError?: boolean
  }
  error?: { code: number; message: string }
}

/**
 * Calls a tool of the MCP server with the key of the organization.
 */
export async function callTool(
  request: APIRequestContext,
  secret: string,
  tool: string
): Promise<ToolAnswer> {
  const response = await request.post('/mcp', {
    headers: {
      'authorization': `Bearer ${secret}`,
      'accept': 'application/json, text/event-stream',
      'content-type': 'application/json',
    },
    data: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: tool, arguments: {} },
    },
  })

  expect(response.status()).toBe(200)

  return (await response.json()) as ToolAnswer
}
