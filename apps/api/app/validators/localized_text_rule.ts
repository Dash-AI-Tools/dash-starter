import vine from '@vinejs/vine'
import { SUPPORTED_LOCALES } from '#app/locales'

/**
 * Validates a localized jsonb field: an object with one string per supported
 * locale, for example `{ en: 'Pro', es: 'Pro' }`.
 */
export const localizedText = vine.createRule(
  (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('The value must be an object with one entry per locale')
    }

    const missing = SUPPORTED_LOCALES.filter((locale) => {
      const entry = (value as Record<string, unknown>)[locale]
      return typeof entry !== 'string' || entry.trim() === ''
    })

    if (missing.length) {
      throw new Error(`Missing translation for: ${missing.join(', ')}`)
    }

    const extra = Object.keys(value).filter(
      (key) => !SUPPORTED_LOCALES.includes(key as (typeof SUPPORTED_LOCALES)[number])
    )
    if (extra.length) {
      throw new Error(`Unsupported locale: ${extra.join(', ')}`)
    }

    return value
  },
  { name: 'localizedText' }
)
