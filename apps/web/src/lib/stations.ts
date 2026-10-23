import type { ComponentType, SVGProps } from 'react'
import {
  AiPictogram,
  AuthPictogram,
  BillingPictogram,
  EmailPictogram,
  McpPictogram,
  OrgsPictogram,
} from '@/components/brand/pictograms'

/**
 * A capability of the product. Each one is a station of the line: it keeps
 * its colour on every surface, from the landing page to the sidebar and the
 * charts. Its pictogram signs it on the public site; the sidebar keeps one
 * icon per destination, because several destinations share a station.
 */
export type StationId = 'auth' | 'orgs' | 'billing' | 'ai' | 'mcp' | 'email'

/**
 * The colour a destination is painted with: a station, or the line itself for
 * the places that belong to every station.
 */
export type StationTone = StationId | 'line'

/**
 * The stations, in the order the line visits them.
 */
export const STATIONS: { id: StationId; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'auth', icon: AuthPictogram },
  { id: 'orgs', icon: OrgsPictogram },
  { id: 'billing', icon: BillingPictogram },
  { id: 'ai', icon: AiPictogram },
  { id: 'mcp', icon: McpPictogram },
  { id: 'email', icon: EmailPictogram },
]

/**
 * How a station is spelled inside the keys of the catalog, such as
 * `stationBillingName`.
 */
export const STATION_KEY_NAMES: Record<StationId, string> = {
  auth: 'Auth',
  orgs: 'Orgs',
  billing: 'Billing',
  ai: 'Ai',
  mcp: 'Mcp',
  email: 'Email',
}

/**
 * The colour of a station, as a design token. Rebranding the product means
 * changing the tokens, never this map.
 */
export function stationColor(tone: StationTone): string {
  return tone === 'line' ? 'var(--line)' : `var(--station-${tone})`
}
