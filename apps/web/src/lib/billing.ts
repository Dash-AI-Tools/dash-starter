import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/api'

/**
 * The state of the billing of an organization, as the API returns it.
 */
export type Billing = Awaited<ReturnType<typeof client.api.billing.show>>['billing']

/**
 * A plan of the catalog, as the API returns it.
 */
export type Plan = Awaited<ReturnType<typeof client.api.plan.index>>['plans'][number]

/**
 * The interval a plan is paid with.
 */
export type PlanInterval = 'month' | 'year'

/**
 * The limits a plan gives to an organization.
 */
export type Entitlements = Plan['entitlements']

/**
 * Reads the state of the billing of an organization.
 */
export function useBilling(orgSlug: string) {
  return useQuery({
    queryKey: ['billing', orgSlug],
    queryFn: async () => {
      const response = await client.api.billing.show({ params: { orgSlug } })
      return response.billing
    },
  })
}

/**
 * Reads the catalog of plans.
 */
export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await client.api.plan.index({})
      return response.plans
    },
  })
}

/**
 * Sends the browser to a page of the payment provider.
 *
 * The redirect leaves the application, so it lives in one place the tests can
 * replace.
 */
export function redirectTo(url: string) {
  window.location.href = url
}
