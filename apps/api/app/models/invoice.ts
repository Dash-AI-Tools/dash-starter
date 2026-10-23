import { InvoiceSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Organization from '#models/organization'

/**
 * The states of an invoice: the period was paid, or its charge failed.
 */
export type InvoiceState = 'paid' | 'failed'

export default class Invoice extends InvoiceSchema {
  /**
   * The state of the invoice.
   */
  declare state: InvoiceState

  /**
   * The organization the invoice belongs to.
   */
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
