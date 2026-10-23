import { Link, Outlet } from 'react-router'
import { LogoMark } from '@/components/brand/logo-mark'
import { LanguageSwitcher } from '@/components/language-switcher'
import { PalettePicker } from '@/components/palette-picker'
import { ThemeToggle } from '@/components/theme-toggle'
import { useConsent } from '@/providers/consent-provider'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { useCurrentUser } from '@/lib/session'

/**
 * The layout of the public site: the header, the page and the footer.
 *
 * Every public page shares it, so the navigation, the language and the legal
 * links are always in the same place.
 */
export default function PublicLayout() {
  const { t } = useI18n()
  const { data: user } = useCurrentUser()
  const { openPreferences } = useConsent()

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-line/30">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:h-16 sm:flex-nowrap sm:px-6 sm:py-0 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md font-heading text-xl font-bold tracking-[-0.01em]"
          >
            <LogoMark />
            {t('appName')}
          </Link>

          <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/pricing"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              {t('pricingNav')}
            </Link>

            <div className="flex items-center gap-0.5">
              {user ? null : <PalettePicker />}
              <LanguageSwitcher />
              <ThemeToggle />
            </div>

            <span aria-hidden className="hidden h-5 w-px bg-border sm:block" />

            {user ? (
              <Link to="/app">
                <Button size="sm">{t('goDashboard')}</Button>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
                >
                  {t('signIn')}
                </Link>
                <Link to="/signup">
                  <Button size="sm">{t('signUp')}</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <div className="max-w-xs">
            <p className="flex items-center gap-2.5 font-heading text-lg font-bold">
              <LogoMark className="size-6" />
              {t('appName')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t('tagline')}</p>
          </div>

          <nav aria-label={t('footerProduct')} className="space-y-2">
            <p className="text-sm font-medium">{t('footerProduct')}</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <Link to="/pricing" className="hover:text-foreground">
                  {t('pricingNav')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t('footerLegal')} className="space-y-2">
            <p className="text-sm font-medium">{t('footerLegal')}</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <Link to="/terms" className="hover:text-foreground">
                  {t('footerTerms')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground">
                  {t('footerPrivacy')}
                </Link>
              </li>
              <li>
                <button type="button" className="hover:text-foreground" onClick={openPreferences}>
                  {t('footerCookies')}
                </button>
              </li>
              <li>
                <a href={`mailto:${t('supportEmail')}`} className="hover:text-foreground">
                  {t('footerContact')}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t">
          <p className="mx-auto max-w-7xl px-4 py-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
            {t('footerRights', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  )
}
