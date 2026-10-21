import { BaseMail } from '@adonisjs/mail'
import i18nManager from '@adonisjs/i18n/services/main'
import { LEGAL_ADDRESS, PRODUCT_NAME, SUPPORT_EMAIL } from '#brand'

/**
 * The content of an email, as the shared layout understands it.
 */
export type EmailContent = {
  /** Headline of the email. */
  title: string
  /** Body paragraphs, in order. */
  paragraphs: string[]
  /** Rows of details, rendered as a table. */
  details?: { label: string; value: string }[]
  /** The call to action and the link it points to. */
  cta?: { label: string; url: string }
  /** Small print shown at the end of the email. */
  footnote?: string
}

/**
 * The base of every transactional email: it renders the shared layout in the
 * language of the recipient and translates the messages of the API catalogs.
 */
export default abstract class AppMail extends BaseMail {
  /**
   * The language of the recipient.
   */
  protected readonly locale: string

  constructor(locale: string) {
    super()

    this.locale = locale
  }

  /**
   * Translates a message of the API catalogs in the locale of the recipient.
   */
  protected t(key: string, params?: Record<string, unknown>): string {
    return i18nManager.locale(this.locale).t(key, params)
  }

  /**
   * Formats a number with the separators of the locale of the recipient.
   */
  protected number(value: number): string {
    return i18nManager.locale(this.locale).formatNumber(value)
  }

  /**
   * Formats a date with the conventions of the locale of the recipient.
   */
  protected date(value: Date): string {
    return i18nManager.locale(this.locale).formatDate(value)
  }

  /**
   * Formats an amount of money with the currency and the conventions of the
   * locale of the recipient.
   */
  protected currency(value: number, currency: string): string {
    return i18nManager.locale(this.locale).formatCurrency(value, { currency })
  }

  /**
   * Renders the shared layout, as HTML and as plain text.
   */
  protected render(content: EmailContent): void {
    const data = { locale: this.locale, ...content, ...this.footer() }

    this.message.htmlView('emails/layout', data)
    this.message.textView('emails/layout_text', data)
  }

  /**
   * The footer shared by every email.
   */
  private footer() {
    return {
      sentBy: this.t('mail.layout.sent_by', { app: PRODUCT_NAME }),
      support: this.t('mail.layout.support', { email: SUPPORT_EMAIL }),
      legal: this.t('mail.layout.legal', { address: LEGAL_ADDRESS }),
      automated: this.t('mail.layout.automated'),
    }
  }
}
