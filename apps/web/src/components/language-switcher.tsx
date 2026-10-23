import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LOCALES, useI18n } from '@/lib/i18n'

/**
 * Switches the active language with one click. The current route is
 * untouched: only the locale changes, so the visitor stays on the page they
 * were reading. The icon is the only label, so the name of the button says
 * which language the click brings.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const next = LOCALES.find((option) => option !== locale) ?? locale
  const label = t('switchToLanguage', {
    language: t(next === 'en' ? 'english' : 'spanish'),
  })

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => setLocale(next)}
      aria-label={label}
      title={label}
    >
      <Languages className="size-4" />
    </Button>
  )
}
