import { useSyncExternalStore } from 'react'

/**
 * A record found by the global search.
 */
export type SearchResult = {
  /** The identifier of the record. */
  id: string
  /** The label shown in the palette. */
  label: string
  /** The extra line shown under the label. */
  description?: string
  /** The text searched besides the label. */
  keywords?: string[]
  /** Called when the record is picked. */
  onSelect: () => void
}

/**
 * A feature that exposes its records to the global search.
 */
export type SearchProvider = {
  /** The group the results of the provider are shown in. */
  group: string
  /** The records that match a query. */
  search: (query: string) => Promise<SearchResult[]>
}

let providers: SearchProvider[] = []
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Registers a search provider and returns the function that removes it.
 * Features call it when they mount, so the palette always knows about the
 * records of the pages that are open.
 */
export function registerSearchProvider(provider: SearchProvider): () => void {
  providers = [...providers, provider]
  emit()

  return () => {
    providers = providers.filter((registered) => registered !== provider)
    emit()
  }
}

/**
 * The registered search providers.
 */
export function useSearchProviders(): SearchProvider[] {
  return useSyncExternalStore(
    subscribe,
    () => providers,
    () => providers
  )
}
