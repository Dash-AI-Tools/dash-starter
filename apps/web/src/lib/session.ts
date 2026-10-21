import { useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'

/**
 * The answer of the session endpoint. The type comes from the API registry,
 * so the web app and the API never disagree about the shape of the user.
 */
type SessionResponse = Awaited<ReturnType<typeof client.api.auth.session.show>>

/**
 * The user as the API returns it. The password never travels with it.
 */
export type CurrentUser = SessionResponse['user']

/** The key of the query that holds the session of the visitor. */
export const SESSION_QUERY_KEY = ['session'] as const

/**
 * Reads the session of the visitor. The endpoint always answers, so the query
 * only fails when the API cannot be reached.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const response = await client.api.auth.session.show({})
      return response.user
    },
  })
}

/**
 * Writes the session into the cache, so the app knows who is signed in
 * without asking the API again.
 */
export function useSetCurrentUser() {
  const queryClient = useQueryClient()

  return (user: CurrentUser | null) => queryClient.setQueryData(SESSION_QUERY_KEY, user)
}
