/**
 * The consent of the visitor about the cookies of the product.
 *
 * The choice lives in a first-party cookie with the categories, the version of
 * the policy and the moment it was made. A choice for an older version of the
 * policy, or one older than twelve months, is not a choice: the banner asks
 * again.
 */

/**
 * The categories of cookies the visitor is asked about. The necessary one is
 * always on: the product does not work without it.
 */
export type ConsentCategory = 'necessary' | 'analytics' | 'marketing'

/**
 * The choice of the visitor, one flag per category.
 */
export type ConsentChoices = {
  /** Always granted. */
  necessary: true
  /** Anonymous measurement of the use of the product. */
  analytics: boolean
  /** Measurement of the campaigns. */
  marketing: boolean
}

/**
 * The consent as it is stored in the cookie.
 */
export type StoredConsent = {
  /** The version of the policy the choice was made for. */
  v: string
  /** The categories the visitor allowed. */
  categories: ConsentChoices
  /** When the choice was made, in milliseconds since the epoch. */
  ts: number
}

/** Name of the cookie that stores the choice of the visitor. */
export const CONSENT_COOKIE = 'dash_consent'

/**
 * The version of the cookie policy. Bump it when the policy changes: the
 * visitors that accepted the older one are asked again.
 */
export const CONSENT_POLICY_VERSION = '2026-01-01'

/**
 * The event that opens the preferences of the cookies from anywhere in the
 * app: the footer of the public site and the menu of the account use it.
 */
export const OPEN_COOKIE_PREFERENCES = 'dash:open-cookie-preferences'

/**
 * The choice of a visitor that has not decided yet: only the necessary
 * cookies are allowed.
 */
export const DEFAULT_CHOICES: ConsentChoices = {
  necessary: true,
  analytics: false,
  marketing: false,
}

/**
 * The categories that can be granted or denied. The necessary one is not one
 * of them: it is always on.
 */
export const OPTIONAL_CATEGORIES = ['analytics', 'marketing'] as const

/**
 * The moment a choice made at `from` stops being valid.
 */
function expiresAt(from: number): number {
  const date = new Date(from)
  date.setMonth(date.getMonth() + 12)
  return date.getTime()
}

/**
 * Reads the choice of the visitor.
 *
 * A choice that is missing, that belongs to an older version of the policy or
 * that is older than twelve months is no choice at all.
 */
export function readConsent(): StoredConsent | null {
  if (typeof document === 'undefined') return null

  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`))
  const raw = match?.[1]
  if (!raw) return null

  let stored: unknown
  try {
    stored = JSON.parse(decodeURIComponent(raw))
  } catch {
    return null
  }

  if (!isStoredConsent(stored)) return null
  if (stored.v !== CONSENT_POLICY_VERSION) return null
  if (expiresAt(stored.ts) < Date.now()) return null

  return stored
}

/**
 * Stores the choice of the visitor for the next twelve months.
 */
export function writeConsent(categories: ConsentChoices): void {
  if (typeof document === 'undefined') return

  const stored: StoredConsent = {
    v: CONSENT_POLICY_VERSION,
    categories,
    ts: Date.now(),
  }

  const maxAge = Math.floor((expiresAt(stored.ts) - stored.ts) / 1000)

  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
    JSON.stringify(stored)
  )}; path=/; max-age=${maxAge}; samesite=lax`
}

/**
 * Whether a value read from the cookie is a consent.
 */
function isStoredConsent(value: unknown): value is StoredConsent {
  if (typeof value !== 'object' || value === null) return false

  const stored = value as Partial<StoredConsent>
  if (typeof stored.v !== 'string' || typeof stored.ts !== 'number') return false

  const categories = stored.categories
  if (typeof categories !== 'object' || categories === null) return false

  return (
    categories.necessary === true &&
    typeof categories.analytics === 'boolean' &&
    typeof categories.marketing === 'boolean'
  )
}

/**
 * A script that only loads when its category is granted.
 */
export type ConsentScript = {
  /** The identifier of the script. */
  id: string
  /** The category that has to be granted for the script to load. */
  category: 'analytics' | 'marketing'
  /** Where the script is loaded from. */
  src: string
}

const scripts = new Map<string, ConsentScript>()

/**
 * Registers a script that only loads when the visitor grants its category.
 */
export function registerScript(id: string, category: ConsentScript['category'], src: string): void {
  scripts.set(id, { id, category, src })
}

/**
 * The scripts registered so far.
 */
export function registeredScripts(): ConsentScript[] {
  return [...scripts.values()]
}
