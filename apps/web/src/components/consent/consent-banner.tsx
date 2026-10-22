import { useConsent } from '@/providers/consent-provider'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

/**
 * The banner that asks the visitor for the consent of the cookies.
 *
 * It sits at the bottom of the page and does not block it: the visitor can
 * read the page while the question waits for an answer.
 */
export function ConsentBanner() {
  const { t } = useI18n()
  const { acceptAll, rejectNonEssential, openPreferences } = useConsent()

  return (
    <section
      role="region"
      aria-label={t('bannerTitle')}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-popover/95 p-4 backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold">{t('bannerTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('bannerBody')}</p>
        </div>

        {/**
         * The three actions weigh the same: the visitor is not pushed towards
         * one of them.
         */}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={acceptAll}>
            {t('acceptAll')}
          </Button>
          <Button type="button" variant="outline" onClick={rejectNonEssential}>
            {t('rejectNonEssential')}
          </Button>
          <Button type="button" variant="outline" onClick={openPreferences}>
            {t('customize')}
          </Button>
        </div>
      </div>
    </section>
  )
}
