import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/api'

/**
 * The metrics of the home of an organization, as the API returns them.
 */
export type Dashboard = Awaited<ReturnType<typeof client.api.dashboard.show>>['dashboard']

/**
 * An entry of the recent activity of an organization.
 */
export type DashboardActivity = Dashboard['activity'][number]

/**
 * Reads the metrics of the home of an organization.
 *
 * Every member of the organization reads them, so the query is not gated by
 * the role.
 */
export function useDashboard(orgSlug: string) {
  return useQuery({
    queryKey: ['dashboard', orgSlug],
    queryFn: async () => {
      const response = await client.api.dashboard.show({ params: { orgSlug } })
      return response.dashboard
    },
  })
}
