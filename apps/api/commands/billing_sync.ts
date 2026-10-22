import { CreemClient } from '#services/creem'
import { syncProducts } from '#services/billing_sync'
import { BaseCommand } from '@adonisjs/core/ace'
import app from '@adonisjs/core/services/app'

/**
 * Creates the products of the payment provider that the prices of the
 * catalog need, and reports the prices that do not match the product they
 * point at.
 */
export default class BillingSync extends BaseCommand {
  static commandName = 'billing:sync'
  static description = 'Create the missing products of the payment provider and report the drift'

  async run() {
    const creem = await app.container.make(CreemClient)
    const report = await syncProducts(creem)

    for (const product of report.created) {
      this.logger.info(
        `Created the product ${product.productId} for the plan ${product.planKey} (${product.interval})`
      )
    }

    for (const drift of report.drift) {
      this.logger.warning(
        `The plan ${drift.planKey} (${drift.interval}) costs ${drift.expectedCents} cents in the database and ${drift.foundCents} cents in the payment provider`
      )
    }

    this.logger.info(
      `${report.created.length} products created, ${report.drift.length} prices out of sync, ${report.skipped} prices without a product`
    )
  }
}
