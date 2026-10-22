/**
 * The locales the product ships with. Every user-facing surface — API
 * messages, emails, database content and the web app — uses exactly these.
 */
export const SUPPORTED_LOCALES = ['en', 'es'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Narrow an arbitrary string to a supported locale.
 */
export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale)
}

/**
 * The supported locale of a value, falling back to English.
 */
export function supportedLocale(value: unknown): SupportedLocale {
  return isSupportedLocale(value) ? value : 'en'
}
