import { Navigate } from 'react-router'
import { useCurrentUser } from '@/lib/session'
import { ONBOARDING_PATH, useOrganizations } from '@/lib/organizations'

/**
 * The entry of the app. The user lands on the organization they were working
 * in the last time, which is remembered on the server.
 */
export default function AppIndexPage() {
  const { data: user } = useCurrentUser()
  const { data: organizations = [], isPending } = useOrganizations()

  if (isPending) return null

  const target =
    organizations.find((organization) => organization.id === user?.lastOrganizationId) ??
    organizations[0]

  /**
   * A user without an organization has nothing to open yet: the setup of the
   * first one starts instead.
   */
  if (!target) {
    return <Navigate to={ONBOARDING_PATH} replace />
  }

  return <Navigate to={`/app/${target.slug}`} replace />
}
