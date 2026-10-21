import env from '#start/env'
import { LEGAL_ADDRESS, PRODUCT_NAME, SUPPORT_EMAIL } from '#brand'
import { defineConfig } from '@adonisjs/mail'
import { BrevoTransport } from '@adonisjs/mail/transports/brevo'
import { JSONTransport } from '@adonisjs/mail/transports/json'
import { SMTPTransport } from '@adonisjs/mail/transports/smtp'
import RetryTransport from '#mails/retry_transport'

/**
 * Base URL of the Brevo transactional API. The transport appends the
 * `/smtp/email` path to it.
 */
const BREVO_BASE_URL = 'https://api.brevo.com/v3'

const transport = env.get('MAIL_TRANSPORT')

/**
 * The SMTP transport is used by the local Mailpit catcher during
 * development, the Brevo API in production and the JSON transport in tests,
 * where the messages are inspected in memory instead of being delivered.
 *
 * Every delivery goes through the retry transport, because the provider
 * fails with transient errors often enough that a second attempt usually
 * goes through.
 */
const mailer = () => {
  if (transport === 'brevo') {
    return new RetryTransport(
      new BrevoTransport({ key: env.get('BREVO_API_KEY', ''), baseUrl: BREVO_BASE_URL })
    )
  }

  if (transport === 'smtp') {
    return new RetryTransport(
      new SMTPTransport({
        host: env.get('SMTP_HOST', 'localhost'),
        port: env.get('SMTP_PORT', 1025),
        secure: env.get('SMTP_SECURE', false),
        auth: env.get('SMTP_USER')
          ? {
              type: 'login',
              user: env.get('SMTP_USER', ''),
              pass: env.get('SMTP_PASSWORD', ''),
            }
          : undefined,
      })
    )
  }

  return new RetryTransport(new JSONTransport())
}

export default defineConfig({
  default: 'primary',

  mailers: {
    primary: mailer,
  },

  /**
   * Every email is sent from the same address, so the recipients never see
   * a different sender depending on the template.
   */
  from: env.get('MAIL_FROM'),

  /**
   * The data shared with every template of the emails.
   */
  globals: {
    productName: PRODUCT_NAME,
    supportEmail: SUPPORT_EMAIL,
    legalAddress: LEGAL_ADDRESS,
  },
})
