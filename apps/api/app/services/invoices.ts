import Invoice from '#models/invoice'
import type { InvoiceState } from '#models/invoice'
import type Organization from '#models/organization'
import type { Transition } from '#services/billing_events'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * The state of the invoice each kind of event records. The other events
 * record no invoice: the first period of a checkout is reported by its own
 * `subscription.paid`.
 */
const INVOICE_STATES: Record<string, InvoiceState> = {
  'subscription.paid': 'paid',
  'subscription.past_due': 'failed',
}

/**
 * Records the invoice of a transition, inside the transaction that applies
 * it.
 *
 * The invoice is keyed by the event of the provider, so a replayed delivery
 * never records a second one, on top of the duplicate check of the billing
 * events.
 */
export async function recordInvoice(
  transition: Transition,
  trx: TransactionClientContract
): Promise<Invoice | null> {
  const state = INVOICE_STATES[transition.event.eventType]
  if (!state) {
    return null
  }

  return Invoice.firstOrCreate(
    { providerEventId: transition.event.id },
    {
      organizationId: transition.organization.id,
      plan: transition.planName,
      amount: transition.amountCents,
      currency: transition.currency,
      state,
    },
    { client: trx }
  )
}

/**
 * The invoices of the organization, newest first.
 */
export async function listInvoices(organization: Organization): Promise<Invoice[]> {
  return Invoice.query()
    .where('organizationId', organization.id)
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'desc')
}
