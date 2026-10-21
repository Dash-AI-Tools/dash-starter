import { PRODUCT_NAME } from '#brand'
import type User from '#models/user'
import env from '#start/env'
import AppMail from '#mails/app_mail'

/**
 * The email that proves the ownership of the address. It carries the signed
 * verification link.
 */
export default class VerifyEmail extends AppMail {
  /**
   * The signed link that proves the ownership of the address.
   */
  readonly link: string

  private user: User

  constructor(user: User, link: string, locale: string) {
    super(locale)

    this.user = user
    this.link = link
    this.from = env.get('MAIL_FROM')
    this.subject = this.t('mail.verify_email.subject')
  }

  prepare() {
    this.message.to(this.user.email, this.user.fullName)

    this.render({
      title: this.t('mail.verify_email.title'),
      paragraphs: [
        this.t('mail.verify_email.greeting', { name: this.user.fullName }),
        this.t('mail.verify_email.intro', { app: PRODUCT_NAME }),
        this.t('mail.verify_email.expiry'),
      ],
      cta: { label: this.t('mail.verify_email.cta'), url: this.link },
      footnote: this.t('mail.verify_email.footnote'),
    })
  }
}
