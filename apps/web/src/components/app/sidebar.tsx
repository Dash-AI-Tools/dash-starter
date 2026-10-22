import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink } from 'react-router'
import { OrgSwitcher } from '@/components/app/org-switcher'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { NAV_GROUPS, canAccess, orgPath } from '@/lib/nav'
import { useOrganization } from '@/lib/organizations'
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
              <p className="px-2 text-xs font-medium text-muted-foreground">{t(group.labelKey)}</p>
            ) : null}

            {group.items.map((item) => (
              <NavLink
                key={item.id}
                to={orgPath(orgSlug, item.path)}
                onClick={onNavigate}
                title={collapsed ? t(item.labelKey) : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                    'hover:bg-muted',
                    isActive && 'bg-muted text-foreground',
                    collapsed && 'justify-center'
                  )
                }
              >
                <item.icon className="size-4 shrink-0" />
                {collapsed ? (
                  <span className="sr-only">{t(item.labelKey)}</span>
                ) : (
                  <span className="truncate">{t(item.labelKey)}</span>
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
