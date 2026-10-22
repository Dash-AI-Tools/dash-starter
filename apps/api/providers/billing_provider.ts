import { CreemClient } from '#services/creem'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Registers the client of the payment provider.
 *
 * The client is bound as a singleton, so the tests can replace it with a
 * fake through `app.container.swap(CreemClient, ...)`.
 */
export default class BillingProvider {
  /** The application the provider belongs to. */
  private app: ApplicationService

  constructor(app: ApplicationService) {
    this.app = app
  }

  register() {
    this.app.container.singleton(CreemClient, () => CreemClient.fromEnv())
  }
}
