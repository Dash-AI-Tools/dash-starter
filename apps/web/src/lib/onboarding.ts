import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/api'

/**
 * The steps of the setup of an organization, in the order they happen.
 */
export type OnboardingStep = 'details' | 'use-case' | 'invites' | 'plan' | 'complete' | 'done'

/**
 * The state of the setup of the organization of the visitor, as the API
 * returns it. The step says where the setup is, so the wizard can pick it up
 * where the visitor left it.
 */
export type Onboarding = Awaited<ReturnType<typeof client.api.onboarding.show>>['onboarding']

/**
 * Reads the state of the setup of the organization of the visitor.
 */
export function useOnboarding() {
  return useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const response = await client.api.onboarding.show({})
      return response.onboarding
    },
  })
}
