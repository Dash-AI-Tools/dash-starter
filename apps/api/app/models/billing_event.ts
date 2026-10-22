import { BillingEventSchema } from '#database/schema'

export default class BillingEvent extends BillingEventSchema {
  /**
   * The event as the payment provider sent it.
   */
  declare payload: Record<string, unknown>
}
