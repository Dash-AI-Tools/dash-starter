import { E_INVALID_WEBHOOK_SIGNATURE } from '#exceptions/errors'
import { processEvent, verifySignature, type CreemEvent } from '#services/billing_events'
import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'

export default class CreemWebhookController {
  /**
   * Receives the events of the payment provider.
   *
   * The signature is checked against the raw body of the request before
   * anything is read from it, and every event is applied at most once.
   */
  async handle({ request, response }: HttpContext) {
    const raw = request.raw() ?? ''
    const signature = request.header('creem-signature')

    if (!verifySignature(raw, signature, env.get('CREEM_WEBHOOK_SECRET') ?? '')) {
      throw new E_INVALID_WEBHOOK_SIGNATURE()
    }

    const event = JSON.parse(raw) as CreemEvent

    await processEvent(event)

    return response.status(200).send({ received: true })
  }
}
