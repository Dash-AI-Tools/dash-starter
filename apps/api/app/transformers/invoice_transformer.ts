import type Invoice from '#models/invoice'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * An invoice of an organization, as the billing page lists it.
 *
 * The amount is a number of cents: the web app formats it with the currency
 * in the language of the interface.
 */
export default class InvoiceTransformer extends BaseTransformer<Invoice> {
  toObject() {
    const invoice = this.resource

    return {
      id: invoice.id,
      plan: invoice.plan,
      amount: invoice.amount,
      currency: invoice.currency,
      state: invoice.state,
      createdAt: invoice.createdAt,
    }
  }
}
