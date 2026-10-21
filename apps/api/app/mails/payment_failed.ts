import { PRODUCT_NAME } from '#brand'
import env from '#start/env'
import AppMail from '#mails/app_mail'
import type { SubscriptionDetails } from '#mails/subscription_started'

/**
 * The email that tells the owner of a subscription that the payment failed.
 */
export default class PaymentFailed extends AppMail {
  private details: SubscriptionDetails

  constructor(details: SubscriptionDetails) {
    super(details.locale)

    this.details = details
    this.from = env.get('MAIL_FROM')
    this.subject = this.t('mail.payment_failed.subject')
  }

  prepare() {
    this.message.to(this.details.email, this.details.name)

    this.render({
      title: this.t('mail.payment_failed.title'),
      paragraphs: [
        this.t('mail.payment_failed.greeting', { name: this.details.name ?? '' }),
        this.t('mail.payment_failed.intro', { app: PRODUCT_NAME }),
      ],
      details: [
        { label: this.t('mail.payment_failed.plan_label'), value: this.details.planName },
        {
          label: this.t('mail.payment_failed.amount_label'),
          value: this.currency(this.details.amount, this.details.currency),
        },
      ],
      cta: { label: this.t('mail.payment_failed.cta'), url: this.details.manageUrl },
      footnote: this.t('mail.payment_failed.footnote'),
    })
  }
}
