import { PRODUCT_NAME } from '#brand'
import type User from '#models/user'
import env from '#start/env'
import AppMail from '#mails/app_mail'

/**
 * The email that carries the single-use password reset link.
 */
export default class ResetPassword extends AppMail {
  /**
   * The single-use link that opens the reset form.
   */
  readonly link: string

  private user: User

  constructor(user: User, link: string, locale: string) {
    super(locale)

    this.user = user
    this.link = link
    this.from = env.get('MAIL_FROM')
    this.subject = this.t('mail.reset_password.subject')
  }

  prepare() {
    this.message.to(this.user.email, this.user.fullName)

    this.render({
      title: this.t('mail.reset_password.title'),
      paragraphs: [
        this.t('mail.reset_password.greeting', { name: this.user.fullName }),
        this.t('mail.reset_password.intro', { app: PRODUCT_NAME }),
        this.t('mail.reset_password.expiry'),
      ],
      cta: { label: this.t('mail.reset_password.cta'), url: this.link },
      footnote: this.t('mail.reset_password.footnote'),
    })
  }
}
