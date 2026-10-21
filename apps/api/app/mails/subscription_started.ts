import { PRODUCT_NAME } from '#brand'
import env from '#start/env'
import AppMail from '#mails/app_mail'

/**
 * The details of a subscription, as the billing emails show them.
 */
export type SubscriptionDetails = {
  /** Address of the owner of the subscription. */
  email: string
  /** Name of the owner of the subscription. */
  name?: string
  /** Name of the plan. */
  planName: string
  /** Amount charged, in the major unit of the currency. */
  amount: number
  /** Currency of the amount. */
  currency: string
  /** Moment the subscription renews. */
  renewsAt?: Date
  /** Link to the billing settings of the organization. */
  manageUrl: string
  /** Language of the email. */
  locale: string
}

/**
 * The email that confirms the start of a subscription.
 */
export default class SubscriptionStarted extends AppMail {
  private details: SubscriptionDetails

  constructor(details: SubscriptionDetails) {
    super(details.locale)

    this.details = details
    this.from = env.get('MAIL_FROM')
    this.subject = this.t('mail.subscription_started.subject', { plan: details.planName })
  }

  prepare() {
    this.message.to(this.details.email, this.details.name)

    this.render({
      title: this.t('mail.subscription_started.title', { plan: this.details.planName }),
      paragraphs: [
        this.t('mail.subscription_started.greeting', { name: this.details.name ?? '' }),
        this.t('mail.subscription_started.intro', { app: PRODUCT_NAME }),
      ],
      details: [
        { label: this.t('mail.subscription_started.plan_label'), value: this.details.planName },
        {
          label: this.t('mail.subscription_started.amount_label'),
          value: this.amount(),
        },
        ...(this.details.renewsAt
          ? [
              {
                label: this.t('mail.subscription_started.renewal_label'),
                value: this.date(this.details.renewsAt),
              },
            ]
          : []),
      ],
      cta: { label: this.t('mail.subscription_started.cta'), url: this.details.manageUrl },
      footnote: this.t('mail.subscription_started.footnote'),
    })
  }

  /**
   * The amount charged, formatted with the currency of the subscription.
   */
  private amount(): string {
    return this.currency(this.details.amount, this.details.currency)
  }
}
