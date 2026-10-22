import { PRIVACY_UPDATED_AT } from '@dash/api/legal'
import { LegalDocument } from '@/components/legal/legal-document'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CONSENT_COOKIE } from '@/lib/consent'
import { LOCALE_COOKIE, useI18n, type TranslationKey } from '@/lib/i18n'
import { usePublicPageMeta } from '@/lib/use-page-meta'

/**
 * A cookie of the product: the category it belongs to, its name, what it is
 * for and how long it lasts.
 */
type Cookie = {
  category: TranslationKey
  name: string
  purpose: TranslationKey
  duration: TranslationKey
}

/**
 * The cookies the product sets. The ones of the necessary category are always
 * there; the analytics and the marketing ones only exist when the visitor
 * allows them, so the table says what they would be for.
 */
const COOKIES: Cookie[] = [
  {
    category: 'cookieNecessary',
    name: 'adonis-session',
    purpose: 'cookieSession',
    duration: 'cookieDurationSession',
  },
  {
    category: 'cookieNecessary',
    name: 'XSRF-TOKEN',
    purpose: 'cookieXsrf',
    duration: 'cookieDurationSession',
  },
  {
    category: 'cookieNecessary',
    name: LOCALE_COOKIE,
    purpose: 'cookieLocale',
    duration: 'cookieDurationYear',
  },
  {
    category: 'cookieNecessary',
    name: 'theme',
    purpose: 'cookieTheme',
    duration: 'cookieDurationYear',
  },
  {
    category: 'cookieNecessary',
    name: CONSENT_COOKIE,
    purpose: 'cookieConsent',
    duration: 'cookieDurationMonths',
  },
  {
    category: 'cookieAnalytics',
    name: '—',
    purpose: 'cookieAnalyticsDescription',
    duration: 'cookieDurationUntilRevoked',
  },
  {
    category: 'cookieMarketing',
    name: '—',
    purpose: 'cookieMarketingDescription',
    duration: 'cookieDurationUntilRevoked',
  },
]

/**
 * The privacy policy of the product, with the table of the cookies.
 */
export default function PrivacyPage() {
  const { t, formatDate } = useI18n()

  usePublicPageMeta({
    title: t('privacyTitle'),
    description: t('privacyMetaDescription'),
  })

  const sections = [
    { title: t('privacyData'), body: t('privacyDataBody') },
    { title: t('privacyUsage'), body: t('privacyUsageBody') },
    { title: t('privacyProviders'), body: t('privacyProvidersBody') },
    { title: t('privacyRetention'), body: t('privacyRetentionBody') },
    { title: t('privacyRights'), body: t('privacyRightsBody') },
  ]

  return (
    <LegalDocument
      title={t('privacyTitle')}
      notice={t('privacyPlaceholderNotice')}
      meta={
        <p>{t('privacyUpdated', { date: formatDate(PRIVACY_UPDATED_AT, { dateStyle: 'medium', timeZone: 'UTC' }) })}</p>
      }
      intro={t('privacyIntro')}
      sections={sections}
    >
      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">{t('privacyCookies')}</h2>
        <p className="mt-2 text-muted-foreground">{t('privacyCookiesBody')}</p>

        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('cookieCategory')}</TableHead>
                <TableHead>{t('cookieName')}</TableHead>
                <TableHead>{t('cookiePurpose')}</TableHead>
                <TableHead>{t('cookieDuration')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {COOKIES.map((cookie) => (
                <TableRow key={`${cookie.category}-${cookie.name}`}>
                  <TableCell>{t(cookie.category)}</TableCell>
                  <TableCell className="font-mono text-xs">{cookie.name}</TableCell>
                  <TableCell className="whitespace-normal">{t(cookie.purpose)}</TableCell>
                  <TableCell>{t(cookie.duration)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </LegalDocument>
  )
}
