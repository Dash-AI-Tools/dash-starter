import { useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'

/** An import, as the API returns it. */
export type BulkImport = Awaited<ReturnType<typeof client.api.bulkImport.store>>['import']

/**
 * Uploads the CSV of an import. The file travels as a multipart form and the
 * generated registry describes the JSON bodies only, so the body is sent
 * outside of the typed arguments.
 */
export function uploadImport(orgSlug: string, file: File): Promise<BulkImport> {
  const body = new FormData()
  body.append('file', file)

  return client.api.bulkImport
    .store({
      params: { orgSlug },
      body,
    } as unknown as Parameters<typeof client.api.bulkImport.store>[0])
    .then((response) => response.import)
}

/**
 * Uploads an import and refreshes the members and the invitations, so the
 * invited addresses show up as soon as the import finishes.
 */
export function useBulkImport(orgSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadImport(orgSlug, file),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members', orgSlug] }),
        queryClient.invalidateQueries({ queryKey: ['invitations', orgSlug] }),
      ])
    },
  })
}
