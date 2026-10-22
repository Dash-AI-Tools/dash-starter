import { TERMS_UPDATED_AT, TERMS_VERSION } from '@dash/api/legal'
import { LegalDocument } from '@/components/legal/legal-document'
import { useI18n } from '@/lib/i18n'
import { usePublicPageMeta } from '@/lib/use-page-meta'

/**
 * The terms of service of the product.
 *
 * The text is a placeholder that the owner of the product replaces: the
 * version and the date tell the readers how old the text is.
 */
export default function TermsPage() {
  const { t, formatDate } = useI18n()

  usePublicPageMeta({
    title: t('termsTitle'),
    description: t('termsMetaDescription'),
  })

  const sections = [
    { title: t('termsUse'), body: t('termsUseBody') },
    { title: t('termsAccounts'), body: t('termsAccountsBody') },
    { title: t('termsContent'), body: t('termsContentBody') },
    { title: t('termsPayments'), body: t('termsPaymentsBody') },
    { title: t('termsAi'), body: t('termsAiBody') },
    { title: t('termsAvailability'), body: t('termsAvailabilityBody') },
    { title: t('termsLiability'), body: t('termsLiabilityBody') },
    { title: t('termsTermination'), body: t('termsTerminationBody') },
    { title: t('termsChanges'), body: t('termsChangesBody') },
  ]

  return (
    <LegalDocument
      title={t('termsTitle')}
      notice={t('termsPlaceholderNotice')}
      meta={
        <p>
          {t('termsVersion', { version: TERMS_VERSION })}
          {' · '}
          {t('termsUpdated', { date: formatDate(TERMS_UPDATED_AT, { dateStyle: 'medium', timeZone: 'UTC' }) })}
        </p>
      }
      intro={t('termsIntro')}
      sections={sections}
    />
  )
}
