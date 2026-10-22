import { Link } from 'react-router'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { usePublicPageMeta } from '@/lib/use-page-meta'

const FEATURES = [
  { key: 'featureAuth', icon: Check },
  { key: 'featureOrgs', icon: Check },
  { key: 'featureBilling', icon: Check },
  { key: 'featureAi', icon: Check },
  { key: 'featureEmail', icon: Check },
  { key: 'featureMcp', icon: Check },
] as const

const FAQ = [
  { q: 'faq1Q', a: 'faq1A' },
  { q: 'faq2Q', a: 'faq2A' },
  { q: 'faq3Q', a: 'faq3A' },
  { q: 'faq4Q', a: 'faq4A' },
] as const

/**
 * The landing page of the product.
 *
 * The copy is placeholder content that the owner of the product replaces: the
 * structure is the one every SaaS needs.
 */
export default function Home() {
  const { t } = useI18n()
  usePublicPageMeta({
    title: t('metaTitle'),
    description: t('metaDescription'),
    ogTitle: t('ogTitle'),
    ogDescription: t('ogDescription'),
  })

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{t('heroTitle')}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t('heroSubtitle')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup">
            <Button size="lg">
              {t('heroPrimary')}
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="outline">
              {t('heroSecondary')}
            </Button>
          </Link>
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">{t('featuresTitle')}</h2>
          <p className="mt-3 text-muted-foreground">{t('featuresSubtitle')}</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ key, icon: Icon }) => (
              <div key={key} className="rounded-xl border bg-card p-6">
                <Icon className="size-5 text-primary" />
                <h3 className="mt-4 font-semibold">{t(`${key}Title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`${key}Body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="rounded-2xl border bg-card p-10 text-center">
          <Sparkles className="mx-auto size-6 text-primary" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">{t('pricingTitle')}</h2>
          <p className="mt-3 text-muted-foreground">{t('pricingSubtitle')}</p>
          <Link to="/pricing" className="mt-6 inline-block">
            <Button variant="outline">{t('pricingTeaserCta')}</Button>
          </Link>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">{t('faqTitle')}</h2>
          <dl className="mt-8 space-y-6">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <dt className="font-medium">{t(q)}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{t(a)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">{t('ctaTitle')}</h2>
        <p className="mt-3 text-muted-foreground">{t('ctaSubtitle')}</p>
        <Link to="/signup" className="mt-6 inline-block">
          <Button size="lg">{t('ctaButton')}</Button>
        </Link>
      </section>
    </>
  )
}
