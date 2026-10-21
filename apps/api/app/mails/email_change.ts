import { PRODUCT_NAME } from '#brand'
import type User from '#models/user'
import env from '#start/env'
import AppMail from '#mails/app_mail'

/**
 * The email that confirms the change of the email address of an account. It
 * carries the signed link that proves the ownership of the new address.
 */
export default class EmailChange extends AppMail {
  /**
   * The signed link that proves the ownership of the new address.
   */
  readonly link: string

  private user: User

  private email: string

  constructor(user: User, email: string, link: string, locale: string) {
    super(locale)

    this.user = user
    this.email = email
    this.link = link
    this.from = env.get('MAIL_FROM')
    this.subject = this.t('mail.email_change.subject')
  }

  prepare() {
    this.message.to(this.email, this.user.fullName)

    this.render({
      title: this.t('mail.email_change.title'),
      paragraphs: [
        this.t('mail.email_change.greeting', { name: this.user.fullName }),
        this.t('mail.email_change.intro', { app: PRODUCT_NAME, email: this.email }),
        this.t('mail.email_change.expiry'),
      ],
      cta: { label: this.t('mail.email_change.cta'), url: this.link },
      footnote: this.t('mail.email_change.footnote'),
    })
  }
}
