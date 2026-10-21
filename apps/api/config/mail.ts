import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'
import { JSONTransport } from '@adonisjs/mail/transports/json'

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
 */
export default defineConfig({
  default: 'primary',

  mailers: {
    primary:
      transport === 'brevo'
        ? transports.brevo({
            key: env.get('BREVO_API_KEY', ''),
            baseUrl: BREVO_BASE_URL,
          })
        : transport === 'smtp'
          ? transports.smtp({
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
          : () => new JSONTransport(),
  },

  /**
   * Every email is sent from the same address, so the recipients never see
   * a different sender depending on the template.
   */
  from: env.get('MAIL_FROM'),
})
