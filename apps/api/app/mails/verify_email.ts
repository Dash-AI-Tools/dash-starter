import { PRODUCT_NAME } from '#brand'
import { emailLayout } from '#mails/layout'
import type User from '#models/user'
import env from '#start/env'
import i18nManager from '@adonisjs/i18n/services/main'
import { BaseMail } from '@adonisjs/mail'

/**
 * The email that proves the ownership of the address. It carries the signed
 * verification link.
 */
export default class VerifyEmail extends BaseMail {
  /**
   * The user that receives the email.
   */
  private user: User
  /**
   * The signed link that proves the ownership of the address.
   */
  readonly link: string
  /**
   * The language of the email.
   */
  private locale: string

  constructor(user: User, link: string, locale: string) {
    super()

    this.user = user
    this.link = link
    this.locale = locale

    const i18n = i18nManager.locale(locale)
    this.from = env.get('MAIL_FROM')
    this.subject = i18n.t('mail.verify_email.subject')
  }

  prepare() {
    const i18n = i18nManager.locale(this.locale)
    const { html, text } = emailLayout({
      title: i18n.t('mail.verify_email.title'),
      paragraphs: [
        i18n.t('mail.verify_email.greeting', { name: this.user.fullName }),
        i18n.t('mail.verify_email.intro', { app: PRODUCT_NAME }),
        i18n.t('mail.verify_email.expiry'),
      ],
      cta: { label: i18n.t('mail.verify_email.cta'), url: this.link },
      footer: i18n.t('mail.verify_email.footer'),
    })

    this.message.to(this.user.email, this.user.fullName)
    this.message.html(html)
    this.message.text(text)
  }
}
