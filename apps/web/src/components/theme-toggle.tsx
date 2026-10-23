import { Moon, Sun } from 'lucide-react'
import { Button } from '@dash/ui'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/providers/theme-provider'

/**
 * Flips between the light and the dark theme with one click. Picking a theme
 * here is an explicit choice, so it stops following the system preference,
 * which the profile page can restore.
 */
export function ThemeToggle() {
  const { t } = useI18n()
  const { resolvedTheme, setTheme } = useTheme()
  const label = t('toggleTheme')

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={resolvedTheme === 'dark'}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <span aria-hidden="true" className="relative size-4">
        <Sun className="absolute inset-0 size-4 transition-transform duration-200 ease-out dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute inset-0 size-4 rotate-90 scale-0 transition-transform duration-200 ease-out dark:rotate-0 dark:scale-100" />
      </span>
    </Button>
  )
}
