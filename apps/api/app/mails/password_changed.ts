import { PRODUCT_NAME } from '#brand'
import type User from '#models/user'
import env from '#start/env'
import AppMail from '#mails/app_mail'

/**
 * The notice that tells the owner of an account that the password was
 * changed. It closes the loop of the password reset.
 */
export default class PasswordChanged extends AppMail {
  private user: User

  private changedAt: Date

  constructor(user: User, changedAt: Date, locale: string) {
    super(locale)

    this.user = user
    this.changedAt = changedAt
    this.from = env.get('MAIL_FROM')
    this.subject = this.t('mail.password_changed.subject')
  }

  prepare() {
    this.message.to(this.user.email, this.user.fullName)

    this.render({
      title: this.t('mail.password_changed.title'),
      paragraphs: [
        this.t('mail.password_changed.greeting', { name: this.user.fullName }),
        this.t('mail.password_changed.intro', { app: PRODUCT_NAME }),
      ],
      details: [
        {
          label: this.t('mail.password_changed.changed_label'),
          value: this.date(this.changedAt),
        },
      ],
      footnote: this.t('mail.password_changed.footnote'),
    })
  }
}
