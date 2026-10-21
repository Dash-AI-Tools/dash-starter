import env from '#start/env'
import AppMail from '#mails/app_mail'

/**
 * The details of a quota that is about to be exhausted.
 */
export type QuotaDetails = {
  /** Address of the member that owns the organization. */
  email: string
  /** Name of the member that owns the organization. */
  name?: string
  /** The quota that is running out. */
  scope: 'ai' | 'mcp'
  /** The percentage of the quota that has been used. */
  threshold: 80 | 100
  /** Credits used in the current period. */
  used: number
  /** Credits available in the current period. */
  limit: number
  /** Link to the usage page of the organization. */
  usageUrl: string
  /** Language of the email. */
  locale: string
}

/**
 * The email that warns that the AI or the MCP quota of an organization is
 * about to run out, and the one that reports that it is already exhausted.
 */
export default class QuotaThreshold extends AppMail {
  private details: QuotaDetails

  constructor(details: QuotaDetails) {
    super(details.locale)

    this.details = details
    this.from = env.get('MAIL_FROM')
    this.subject = this.t(
      this.details.threshold === 100 ? 'mail.quota.exceeded_subject' : 'mail.quota.warning_subject',
      { scope: this.scope(), percent: this.details.threshold }
    )
  }

  prepare() {
    this.message.to(this.details.email, this.details.name)

    this.render({
      title: this.t(
        this.details.threshold === 100 ? 'mail.quota.exceeded_title' : 'mail.quota.warning_title',
        { scope: this.scope() }
      ),
      paragraphs: [
        this.t('mail.quota.greeting', { name: this.details.name ?? '' }),
        this.t('mail.quota.body', {
          used: this.number(this.details.used),
          limit: this.number(this.details.limit),
          scope: this.scope(),
        }),
      ],
      details: [
        { label: this.t('mail.quota.used_label'), value: this.number(this.details.used) },
        { label: this.t('mail.quota.limit_label'), value: this.number(this.details.limit) },
      ],
      cta: { label: this.t('mail.quota.cta'), url: this.details.usageUrl },
      footnote: this.t('mail.quota.footnote'),
    })
  }

  /**
   * The name of the quota, as the subject and the body show it.
   */
  private scope(): string {
    return this.details.scope === 'ai' ? 'AI' : 'MCP'
  }
}
