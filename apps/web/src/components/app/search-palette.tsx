import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { CommandPalette, type CommandGroupConfig } from '@/components/patterns/command-palette'
import { client } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { NAV_GROUPS, canAccess, orgPath } from '@/lib/nav'
import { ONBOARDING_PATH, useOrganization } from '@/lib/organizations'
import { registerSearchProvider, useSearchProviders } from '@/lib/search'
import { useSignOut } from '@/lib/session'

/**
 * The global search of the application. It looks for the destinations of the
 * navigation, for the actions of the app and for the records the features
 * expose through a search provider, such as the members of the organization.
 */
export function SearchPalette({
  orgSlug,
  open,
  onOpenChange,
}: {
  /** The organization the visitor is working in. */
  orgSlug: string
  /** Whether the palette is open. */
  open: boolean
  /** Called when the palette opens or closes. */
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const signOut = useSignOut()
  const providers = useSearchProviders()
  const { data: organization } = useOrganization(orgSlug)
  const role = organization?.role

  /**
   * The members of the organization are exposed to the search, so an admin
   * can jump to the directory filtered by a name.
   */
  useEffect(
    () =>
      registerSearchProvider({
        group: t('searchGroupMembers'),
        search: async (query) => {
          const response = await client.api.member.index({
            params: { orgSlug },
            query: { search: query },
          })

          return response.members.map((member) => {
            const name = member.user?.fullName ?? member.user?.email ?? ''

            return {
              id: `member-${member.userId}`,
              label: name,
              description: member.user?.email,
              keywords: [member.user?.email ?? ''],
              onSelect: () =>
                navigate(
                  `/app/${orgSlug}/members?search=${encodeURIComponent(member.user?.email ?? name)}`
                ),
            }
          })
        },
      }),
    [orgSlug, t, navigate]
  )

  const groups = useMemo<CommandGroupConfig[]>(() => {
    const destinations = NAV_GROUPS.flatMap((group) => group.items)
      .filter((item) => canAccess(role, item.minRole))
      .map((item) => ({
        id: item.id,
        label: t(item.labelKey),
        icon: <item.icon className="size-4" />,
        onSelect: () => navigate(orgPath(orgSlug, item.path)),
      }))

    const actions = [
      {
        id: 'create-organization',
        label: t('createOrganization'),
        onSelect: () => navigate(ONBOARDING_PATH),
      },
      {
        id: 'sign-out',
        label: t('signOut'),
        onSelect: () => signOut(),
      },
    ]

    return [
      { heading: t('searchGroupNavigation'), items: destinations },
      { heading: t('searchGroupActions'), items: actions },
    ]
  }, [role, orgSlug, t, navigate, signOut])

  /**
   * The records of the features are looked up in every registered provider.
   */
  const search = useCallback(
    async (query: string): Promise<CommandGroupConfig[]> => {
      const found = await Promise.all(
        providers.map(async (provider) => ({
          heading: provider.group,
          items: await provider.search(query),
        }))
      )

      return found.filter((group) => group.items.length > 0)
    },
    [providers]
  )

  return (
    <CommandPalette
      groups={groups}
      search={search}
      open={open}
      onOpenChange={onOpenChange}
      title={t('searchDialogLabel')}
      description={t('searchPlaceholder')}
      placeholder={t('searchPlaceholder')}
    />
  )
}
