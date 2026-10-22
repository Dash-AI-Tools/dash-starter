import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { client } from '@/lib/api'
import { toApiFailure } from '@/lib/api-error'
import { useI18n } from '@/lib/i18n'
import { ONBOARDING_PATH, useOrganizations } from '@/lib/organizations'

/**
 * The switcher of the organization the user is working in. It lists the
 * organizations they belong to and starts the setup of a new one.
 */
export function OrgSwitcher({ orgSlug }: { orgSlug: string }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data: organizations = [] } = useOrganizations()

  const current = organizations.find((organization) => organization.slug === orgSlug)

  /**
   * Remembers the organization on the server, so the next visit lands on it,
   * and moves the user to it.
   */
  async function switchTo(organization: { id: number; slug: string }) {
    try {
      await client.api.profile.rememberOrganization({
        body: { organizationId: organization.id },
      })
      navigate(`/app/${organization.slug}`)
    } catch (error) {
      toast.error(toApiFailure(error).error.message || t('unknownError'))
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className="w-full justify-between"
            aria-label={`${t('switchOrganization')}: ${current?.name ?? t('organizations')}`}
          />
        }
      >
        <span className="flex items-center gap-2 truncate">
          <Building2 className="size-4 shrink-0" />
          <span className="truncate">{current?.name ?? t('organizations')}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('organizations')}</DropdownMenuLabel>

          {organizations.map((organization) => (
            <DropdownMenuItem
              key={organization.id}
              onClick={() => switchTo(organization)}
              className="justify-between"
            >
              <span className="truncate">{organization.name}</span>
              {organization.slug === orgSlug ? <Check className="size-4" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate(ONBOARDING_PATH)}>
          <Plus className="size-4" />
          {t('createOrganization')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
