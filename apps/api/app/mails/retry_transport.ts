import type { MailTransportContract, NodeMailerMessage } from '@adonisjs/mail/types'
import type { MailResponse } from '@adonisjs/mail'
import logger from '@adonisjs/core/services/logger'

/**
 * The number of attempts before a delivery is given up.
 */
const ATTEMPTS = 3

/**
 * The delay before the first retry, in milliseconds. Every attempt doubles
 * it, so the provider is not hammered while it is failing.
 */
const DELAY = 500

/**
 * Sleeps for the given amount of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A transport that retries the deliveries rejected by the provider. Brevo
 * fails with transient errors often enough that a second attempt usually
 * goes through, and a failed delivery has to be visible in the logs.
 */
export default class RetryTransport implements MailTransportContract {
  private transport: MailTransportContract

  private options: { attempts?: number; delay?: number }

  constructor(
    transport: MailTransportContract,
    options: { attempts?: number; delay?: number } = {}
  ) {
    this.transport = transport
    this.options = options
  }

  /**
   * Sends the message, retrying the transient failures of the provider.
   */
  async send(message: NodeMailerMessage, config?: unknown): Promise<MailResponse<unknown>> {
    const attempts = this.options.attempts ?? ATTEMPTS
    const delay = this.options.delay ?? DELAY
    const recipient = message.to?.[0]

    let lastError: unknown

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await this.transport.send(message, config)

        logger.info(
          { messageId: response?.messageId, subject: message.subject, recipient, attempt },
          'email sent'
        )

        return response
      } catch (error) {
        lastError = error

        logger.warn(
          { err: error, subject: message.subject, recipient, attempt },
          'email delivery failed'
        )

        if (attempt < attempts) {
          await sleep(delay * 2 ** (attempt - 1))
        }
      }
    }

    logger.error(
      { err: lastError, subject: message.subject, recipient, attempts },
      'email delivery gave up'
    )

    throw lastError
  }
}
