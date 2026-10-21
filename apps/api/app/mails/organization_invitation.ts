import { PRODUCT_NAME } from '#brand'
import env from '#start/env'
import AppMail from '#mails/app_mail'

/**
 * The details of an invitation. The invitee is not a user yet, so the email
 * carries the plain data of the invitation.
 */
export type InvitationDetails = {
  /** Address of the invitee. */
  email: string
  /** Name of the invitee, when it is known. */
  name?: string
  /** Name of the organization the invitee is invited to. */
  organizationName: string
  /** Name of the member that sent the invitation. */
  inviterName: string
  /** Link that accepts the invitation. */
  acceptUrl: string
  /** Moment the invitation stops being valid. */
  expiresAt: Date
  /** Language of the email. */
  locale: string
}

/**
 * The email that invites somebody to join an organization.
 */
export default class OrganizationInvitation extends AppMail {
  private details: InvitationDetails

  constructor(details: InvitationDetails) {
    super(details.locale)

    this.details = details
    this.from = env.get('MAIL_FROM')
    this.subject = this.t('mail.organization_invitation.subject', {
      inviter: details.inviterName,
      organization: details.organizationName,
    })
  }

  prepare() {
    this.message.to(this.details.email, this.details.name)

    this.render({
      title: this.t('mail.organization_invitation.title', {
        organization: this.details.organizationName,
      }),
      paragraphs: [
        this.t('mail.organization_invitation.greeting', { name: this.details.name ?? '' }),
        this.t('mail.organization_invitation.intro', {
          inviter: this.details.inviterName,
          organization: this.details.organizationName,
          app: PRODUCT_NAME,
        }),
        this.t('mail.organization_invitation.expiry', {
          expiresAt: this.date(this.details.expiresAt),
        }),
      ],
      details: [
        {
          label: this.t('mail.organization_invitation.organization_label'),
          value: this.details.organizationName,
        },
        {
          label: this.t('mail.organization_invitation.inviter_label'),
          value: this.details.inviterName,
        },
      ],
      cta: { label: this.t('mail.organization_invitation.cta'), url: this.details.acceptUrl },
      footnote: this.t('mail.organization_invitation.footnote'),
    })
  }
}
