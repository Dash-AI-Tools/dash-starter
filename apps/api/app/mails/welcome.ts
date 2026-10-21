import { PRODUCT_NAME } from '#brand'
import type User from '#models/user'
import env from '#start/env'
import AppMail from '#mails/app_mail'

/**
 * The email that welcomes a user once the onboarding is completed.
 */
export default class Welcome extends AppMail {
  private user: User

  constructor(user: User, locale: string) {
    super(locale)

    this.user = user
    this.from = env.get('MAIL_FROM')
    this.subject = this.t('mail.welcome.subject', { app: PRODUCT_NAME })
  }

  prepare() {
    this.message.to(this.user.email, this.user.fullName)

    this.render({
      title: this.t('mail.welcome.title', { app: PRODUCT_NAME }),
      paragraphs: [
        this.t('mail.welcome.greeting', { name: this.user.fullName }),
        this.t('mail.welcome.intro', { app: PRODUCT_NAME }),
      ],
      cta: { label: this.t('mail.welcome.cta'), url: env.get('WEB_URL') },
      footnote: this.t('mail.welcome.footnote'),
    })
  }
}
