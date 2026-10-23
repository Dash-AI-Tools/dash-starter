import { Bell, Menu, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { UserMenu } from '@/components/app/user-menu'
import { LanguageSwitcher } from '@/components/language-switcher'
import { PalettePicker } from '@/components/palette-picker'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/lib/i18n'
import { navItemForPath, orgPath } from '@/lib/nav'
import { useOrganization } from '@/lib/organizations'
import { stationColor } from '@/lib/stations'

/**
 * The bar on top of the application: the way back to the navigation, the
 * breadcrumbs of the current page, then a single rail of tools — search, the
 * palette, the language, the theme — closed by the notifications and the menu
 * of the account.
 */
export function TopBar({
  orgSlug,
  onOpenMenu,
  onOpenSearch,
}: {
  /** The organization the visitor is working in. */
  orgSlug: string
  /** Called when the menu of the navigation is opened. */
  onOpenMenu: () => void
  /** Called when the global search is opened. */
  onOpenSearch: () => void
}) {
  const { t } = useI18n()
  const location = useLocation()
  const { data: organization } = useOrganization(orgSlug)

  const current = navItemForPath(location.pathname, orgSlug, organization?.role)

  /**
   * The shortcut is part of the name too: below `sm` the text of the button is
   * hidden and the search would otherwise be left without a name.
   */
  const searchLabel = `${t('searchPlaceholder')} ⌘K`

  return (
    <header className="flex h-14 items-center gap-2 border-b border-line/30 px-3 sm:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onOpenMenu}
        aria-label={t('openMenu')}
        className="md:hidden"
      >
        <Menu className="size-4" />
      </Button>

      <Breadcrumb className="hidden min-w-0 sm:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to={orgPath(orgSlug, '')} />}>
              {organization?.name ?? t('appName')}
            </BreadcrumbLink>
          </BreadcrumbItem>
          {current ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: stationColor(current.station) }}
                  />
                  {t(current.labelKey)}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenSearch}
          aria-label={searchLabel}
          className="mr-1 gap-2 text-muted-foreground max-sm:border-transparent max-sm:bg-transparent dark:max-sm:border-transparent dark:max-sm:bg-transparent"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">{t('searchPlaceholder')}</span>
          <kbd className="hidden rounded border px-1 font-mono text-[10px] sm:inline">⌘K</kbd>
        </Button>

        <PalettePicker />
        <LanguageSwitcher />
        <ThemeToggle />

        <span aria-hidden className="mx-1.5 hidden h-4 w-px bg-border sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label={t('notifications')} />}
          >
            <Bell className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{t('notificationsEmpty')}</p>
          </DropdownMenuContent>
        </DropdownMenu>

        <UserMenu orgSlug={orgSlug} />
      </div>
    </header>
  )
}
