import { Bell, Menu, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { UserMenu } from '@/components/app/user-menu'
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

/**
 * The bar on top of the application: the way back to the navigation, the
 * breadcrumbs of the current page, the global search, the notifications and
 * the menu of the account.
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

  return (
    <header className="flex h-14 items-center gap-2 border-b px-3 sm:px-4">
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
                <BreadcrumbPage>{t(current.labelKey)}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenSearch}
          className="gap-2 text-muted-foreground"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">{t('searchPlaceholder')}</span>
          <kbd className="hidden rounded border px-1 font-mono text-[10px] sm:inline">⌘K</kbd>
        </Button>

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
