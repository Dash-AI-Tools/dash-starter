import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LOCALES, useI18n } from '@/lib/i18n'

/**
 * Switches the active language. The current route is untouched: only the
 * locale changes, so the visitor stays on the page they were reading.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t('language')}
      className="inline-flex items-center gap-1 rounded-lg border p-0.5"
    >
      <Languages className="hidden size-4 shrink-0 opacity-60 sm:block" aria-hidden="true" />
      {LOCALES.map((option) => (
        <Button
          key={option}
          type="button"
          size="xs"
          variant={option === locale ? 'secondary' : 'ghost'}
          aria-pressed={option === locale}
          onClick={() => setLocale(option)}
          aria-label={option === 'en' ? t('english') : t('spanish')}
        >
          <span className="uppercase sm:hidden">{option}</span>
          <span className="hidden sm:inline">{option === 'en' ? t('english') : t('spanish')}</span>
        </Button>
      ))}
    </div>
  )
}
