import type { CSSProperties } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink } from 'react-router'
import { OrgSwitcher } from '@/components/app/org-switcher'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { NAV_GROUPS, canAccess, orgPath } from '@/lib/nav'
import { useOrganization } from '@/lib/organizations'
import { stationColor } from '@/lib/stations'
import { cn } from '@/lib/utils'

/**
 * The navigation of the application. The items the role of the visitor cannot
 * reach are hidden, and the sidebar can be collapsed to leave only the
 * icons.
 */
export function Sidebar({
  orgSlug,
  collapsed,
  onToggle,
  onNavigate,
}: {
  /** The organization the visitor is working in. */
  orgSlug: string
  /** Whether the sidebar shows only the icons. */
  collapsed: boolean
  /** Called when the sidebar is collapsed or expanded. */
  onToggle: () => void
  /** Called when the visitor picks a destination, to close the drawer. */
  onNavigate?: () => void
}) {
  const { t } = useI18n()
  const { data: organization } = useOrganization(orgSlug)
  const role = organization?.role

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(role, item.minRole)),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <OrgSwitcher orgSlug={orgSlug} />

      <nav className="flex-1 space-y-4 overflow-y-auto" aria-label={t('navMain')}>
        {groups.map((group) => (
          <div key={group.id} className="space-y-1">
            {group.labelKey && !collapsed ? (
              <p className="px-2 pb-1 font-heading text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t(group.labelKey)}
              </p>
            ) : null}

            {group.items.map((item) => (
              <NavLink
                key={item.id}
                to={orgPath(orgSlug, item.path)}
                end
                onClick={onNavigate}
                title={collapsed ? t(item.labelKey) : undefined}
                style={{ '--tile': stationColor(item.station) } as CSSProperties}
                className={({ isActive }) =>
                  cn(
                    'group/nav flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors',
                    'hover:bg-sidebar-accent hover:text-foreground',
                    isActive && 'bg-sidebar-accent text-foreground',
                    collapsed && 'justify-center'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-md border-2 border-(color:--tile) text-(color:--tile) transition-colors',
                        isActive && 'bg-(--tile) text-background'
                      )}
                    >
                      <item.icon className="size-3.5" strokeWidth={2.5} />
                    </span>
                    {collapsed ? (
                      <span className="sr-only">{t(item.labelKey)}</span>
                    ) : (
                      <span className="truncate">{t(item.labelKey)}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggle}
        aria-label={collapsed ? t('sidebarExpand') : t('sidebarCollapse')}
        className={cn('w-full justify-start gap-2', collapsed && 'justify-center')}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <>
            <PanelLeftClose className="size-4" />
            <span>{t('sidebarCollapse')}</span>
          </>
        )}
      </Button>
    </div>
  )
}
