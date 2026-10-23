import {
  CreditCard,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Settings,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { featureNav } from '@/features'
import type { TranslationKey } from '@/lib/i18n'
import type { OrganizationRole } from '@/lib/organizations'
import type { StationTone } from '@/lib/stations'

/**
 * A destination of the application.
 */
export type NavItem = {
  /** The identifier of the destination. */
  id: string
  /** The label of the destination, as a key of the catalog. */
  labelKey: TranslationKey
  /** The path of the destination, relative to the organization. */
  path: string
  /** The icon shown next to the label. */
  icon: LucideIcon
  /** The minimum role that can reach the destination. */
  minRole: OrganizationRole
  /** The station whose colour the destination wears. */
  station: StationTone
}

/**
 * A group of destinations, shown under a heading in the sidebar.
 */
export type NavGroup = {
  /** The identifier of the group. */
  id: string
  /** The heading of the group, as a key of the catalog. */
  labelKey: TranslationKey | null
  /** The destinations of the group. */
  items: NavItem[]
}

/**
 * The navigation of the application. It is declared once and consumed by the
 * sidebar, by the command palette and by the breadcrumbs, so a new page of the
 * core only has to be added here. The destinations of the features come from
 * `@/features`, so a feature never edits this list.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'main',
    labelKey: null,
    items: [
      {
        id: 'dashboard',
        labelKey: 'navDashboard',
        path: '',
        icon: LayoutDashboard,
        minRole: 'member',
        station: 'line',
      },
      {
        id: 'chat',
        labelKey: 'navChat',
        path: 'chat',
        icon: MessageSquare,
        minRole: 'member',
        station: 'ai',
      },
      ...featureNav,
    ],
  },
  {
    id: 'settings',
    labelKey: 'navSettings',
    items: [
      {
        id: 'organization',
        labelKey: 'navOrganization',
        path: 'settings',
        icon: Settings,
        minRole: 'admin',
        station: 'orgs',
      },
      {
        id: 'members',
        labelKey: 'navMembers',
        path: 'members',
        icon: Users,
        minRole: 'member',
        station: 'orgs',
      },
      {
        id: 'billing',
        labelKey: 'navBilling',
        path: 'settings/billing',
        icon: CreditCard,
        minRole: 'admin',
        station: 'billing',
      },
      {
        id: 'api-keys',
        labelKey: 'navApiKeys',
        path: 'settings/api-keys',
        icon: KeyRound,
        minRole: 'admin',
        station: 'mcp',
      },
    ],
  },
  {
    id: 'account',
    labelKey: 'navAccount',
    items: [
      {
        id: 'profile',
        labelKey: 'navProfile',
        path: 'profile',
        icon: User,
        minRole: 'member',
        station: 'auth',
      },
    ],
  },
]

/**
 * How strong each role is. A role can reach a destination when it is at
 * least as strong as the minimum role of the destination.
 */
const ROLE_RANK: Record<OrganizationRole, number> = { member: 0, admin: 1, owner: 2 }

/**
 * Whether a role can reach a destination.
 */
export function canAccess(role: OrganizationRole | null | undefined, minRole: OrganizationRole) {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[minRole]
}

/**
 * The destinations a role can reach, in the order they are declared.
 */
export function visibleNavItems(
  role: OrganizationRole | null | undefined,
  groups: NavGroup[] = NAV_GROUPS
): NavItem[] {
  return groups.flatMap((group) => group.items).filter((item) => canAccess(role, item.minRole))
}

/**
 * The path of a destination inside an organization.
 */
export function orgPath(orgSlug: string, path: string): string {
  return path ? `/app/${orgSlug}/${path}` : `/app/${orgSlug}`
}

/**
 * The destination the given path belongs to, used by the breadcrumbs.
 */
export function navItemForPath(
  pathname: string,
  orgSlug: string,
  role?: OrganizationRole | null
): NavItem | undefined {
  return visibleNavItems(role).find((item) => orgPath(orgSlug, item.path) === pathname)
}
