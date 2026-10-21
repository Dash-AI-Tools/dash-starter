import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { en, type Messages, type TranslationKey } from '@/locales/en'
import { es } from '@/locales/es'

export type Locale = 'en' | 'es'
export type { Messages, TranslationKey }

export const LOCALES: Locale[] = ['en', 'es']
export const DEFAULT_LOCALE: Locale = 'en'

/** Name of the cookie that stores the visitor's explicit language choice. */
export const LOCALE_COOKIE = 'locale'

const dictionaries: Record<Locale, Messages> = { en, es }

/**
 * Interpolate `{placeholder}` tokens in a translated string.
 */
export function interpolate(
  text: string,
  params?: Record<string, string | number>
): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, token: string) =>
    token in params ? String(params[token]) : match
  )
}

/**
 * Pick the right plural form for the active locale.
 */
export function plural(
  locale: Locale,
  count: number,
  forms: { one: string; other: string }
): string {
  const rule = new Intl.PluralRules(locale).select(count)
  return rule === 'one' ? forms.one : forms.other
}

export function formatDate(
  locale: Locale,
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(locale, options).format(date)
}

export function formatNumber(
  locale: Locale,
  value: number,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

export function formatCurrency(
  locale: Locale,
  amountInMinorUnits: number,
  currency: string,
  options: Intl.NumberFormatOptions = {}
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...options,
  }).format(amountInMinorUnits / 100)
}

/**
 * Resolve the locale from the browser preferences. Used on the first visit,
 * before an explicit choice has been stored.
 */
export function detectLocale(navigatorLanguages?: readonly string[]): Locale {
  const languages = navigatorLanguages ?? navigator?.languages ?? []
  for (const language of languages) {
    const code = language.toLowerCase().split('-')[0]
    if (code === 'es') return 'es'
    if (code === 'en') return 'en'
  }
  return DEFAULT_LOCALE
}

function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`)
  )
  const value = match?.[1]
  return value === 'en' || value === 'es' ? value : null
}

function writeLocaleCookie(locale: Locale) {
  if (typeof document === 'undefined') return
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${oneYear}; samesite=lax`
}

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  /** Translate a key, interpolating `{placeholders}`. */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  /** Translate a key and select its plural form. */
  plural: (forms: { one: string; other: string }, count: number) => string
  formatDate: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatCurrency: (
    amountInMinorUnits: number,
    currency: string,
    options?: Intl.NumberFormatOptions
  ) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return readLocaleCookie() ?? detectLocale()
  })

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    writeLocaleCookie(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
    return {
      locale,
      setLocale,
      t: (key, params) => {
        const text = dictionary[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key
        return interpolate(text, params)
      },
      plural: (forms, count) => plural(locale, count, forms),
      formatDate: (value, options) => formatDate(locale, value, options),
      formatNumber: (value, options) => formatNumber(locale, value, options),
      formatCurrency: (amount, currency, options) =>
        formatCurrency(locale, amount, currency, options),
    }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
