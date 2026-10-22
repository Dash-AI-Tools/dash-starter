import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'

/**
 * A key of the organization, as the API returns it.
 */
export type ApiKey = Awaited<ReturnType<typeof client.api.apiKey.index>>['apiKeys'][number]

/**
 * The state of the MCP server of the organization: its keys, the calls they
 * made this period and whether the plan of the organization reaches the
 * server at all.
 */
export type ApiKeysState = Awaited<ReturnType<typeof client.api.apiKey.index>>

/**
 * Reads the keys of the organization and the calls they made this period.
 */
export function useApiKeys(orgSlug: string) {
  return useQuery({
    queryKey: ['api-keys', orgSlug],
    queryFn: async () => await client.api.apiKey.index({ params: { orgSlug } }),
  })
}

/**
 * Creates a key and answers with its secret, which is only shown once.
 */
export function useCreateApiKey(orgSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      name: string
      scopes: ('mcp:read' | 'mcp:write')[]
      expiresAt?: string
    }) => await client.api.apiKey.store({ params: { orgSlug }, body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys', orgSlug] }),
  })
}

/**
 * Revokes a key, so the clients that hold it stop working right away.
 */
export function useRevokeApiKey(orgSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) =>
      await client.api.apiKey.destroy({ params: { orgSlug, id: String(id) } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys', orgSlug] }),
  })
}
