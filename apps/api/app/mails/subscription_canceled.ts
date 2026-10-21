import { PRODUCT_NAME } from '#brand'
import env from '#start/env'
import AppMail from '#mails/app_mail'

/**
 * The details of a canceled subscription.
 */
export type CanceledSubscriptionDetails = {
  /** Address of the owner of the subscription. */
  email: string
  /** Name of the owner of the subscription. */
  name?: string
  /** Name of the plan that was canceled. */
  planName: string
  /** Link to the plans of the product. */
  plansUrl: string
  /** Language of the email. */
  locale: string
}

/**
 * The email that confirms the cancellation of a subscription.
 */
export default class SubscriptionCanceled extends AppMail {
  private details: CanceledSubscriptionDetails

  constructor(details: CanceledSubscriptionDetails) {
    super(details.locale)

    this.details = details
    this.from = env.get('MAIL_FROM')
    this.subject = this.t('mail.subscription_canceled.subject')
  }

  prepare() {
    this.message.to(this.details.email, this.details.name)

    this.render({
      title: this.t('mail.subscription_canceled.title'),
      paragraphs: [
        this.t('mail.subscription_canceled.greeting', { name: this.details.name ?? '' }),
        this.t('mail.subscription_canceled.intro', { app: PRODUCT_NAME }),
      ],
      details: [
        {
          label: this.t('mail.subscription_canceled.plan_label'),
          value: this.details.planName,
        },
      ],
      cta: { label: this.t('mail.subscription_canceled.cta'), url: this.details.plansUrl },
      footnote: this.t('mail.subscription_canceled.footnote'),
    })
  }
}
