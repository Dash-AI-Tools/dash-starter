import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { en, catalogs } from '@/locales/en'
import { es, catalogs as esCatalogs } from '@/locales/es'
import {
  DEFAULT_LOCALE,
  detectLocale,
  formatCurrency,
  formatDate,
  formatNumber,
  interpolate,
  I18nProvider,
  plural,
  useI18n,
} from '@/lib/i18n'

describe('interpolation', () => {
  it('replaces the placeholders', () => {
    expect(interpolate('Hello {name}', { name: 'Ada' })).toBe('Hello Ada')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(interpolate('Hello {name}', { other: 'x' })).toBe('Hello {name}')
  })

  it('returns the text unchanged without params', () => {
    expect(interpolate('Hello {name}')).toBe('Hello {name}')
  })
})

describe('plurals', () => {
  it('picks the singular form for one in English', () => {
    expect(plural('en', 1, { one: 'one item', other: 'many items' })).toBe('one item')
  })

  it('picks the plural form for zero in English', () => {
    expect(plural('en', 0, { one: 'one item', other: 'many items' })).toBe('many items')
  })

  it('picks the plural form for two in Spanish', () => {
    expect(plural('es', 2, { one: 'un elemento', other: 'varios elementos' })).toBe(
      'varios elementos'
    )
  })
})

describe('formatting', () => {
  it('formats a date with the locale conventions', () => {
    const date = new Date('2026-01-10T12:00:00Z')

    expect(formatDate('en', date, { dateStyle: 'long', timeZone: 'UTC' })).toBe('January 10, 2026')
    expect(formatDate('es', date, { dateStyle: 'long', timeZone: 'UTC' })).toBe(
      '10 de enero de 2026'
    )
  })

  it('formats a number with the locale conventions', () => {
    expect(formatNumber('en', 1234.5)).toBe('1,234.5')
    expect(formatNumber('es', 1234.5)).toBe('1234,5')
  })

  it('formats a currency with the locale conventions', () => {
    expect(formatCurrency('es', 1900, 'USD')).toContain('19')
    expect(formatCurrency('es', 1900, 'USD')).toContain(',00')
  })
})

describe('detectLocale', () => {
  it('picks Spanish from a regional browser language', () => {
    expect(detectLocale(['es-MX', 'en-US'])).toBe('es')
  })

  it('picks English from a regional browser language', () => {
    expect(detectLocale(['en-GB'])).toBe('en')
  })

  it('falls back to the default locale for an unsupported language', () => {
    expect(detectLocale(['fr-FR'])).toBe(DEFAULT_LOCALE)
  })
})

describe('catalogs', () => {
  it('translates the same key in both locales', () => {
    expect(en.tagline).not.toBe(es.tagline)
  })

  it('falls back to the default locale for a missing key', () => {
    expect(en['notAKey' as keyof typeof en]).toBeUndefined()
  })

  it('keeps the same keys in both catalogs', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort())
  })

  it('keeps a key out of two namespaces unless both say the same', () => {
    /**
     * The catalog is flat, so a key defined in two namespaces would be
     * overridden by the one merged last, and the page would show a string
     * that belongs to another one.
     */
    for (const locale of [catalogs, esCatalogs]) {
      const conflicts: string[] = []

      for (const [namespace, messages] of Object.entries(locale)) {
        for (const [key, value] of Object.entries(messages)) {
          for (const [other, otherMessages] of Object.entries(locale)) {
            if (other === namespace) continue

            const otherValue = (otherMessages as Record<string, string>)[key]
            if (otherValue !== undefined && otherValue !== value) {
              conflicts.push(`${namespace}.${key} and ${other}.${key}`)
            }
          }
        }
      }

      expect(conflicts).toEqual([])
    }
  })
})

function TranslationProbe({ translationKey }: { translationKey: 'appName' | 'missingKey' }) {
  const { t } = useI18n()
  return <span>{t(translationKey as never)}</span>
}

describe('translation lookup', () => {
  it('translates a key in the active locale', () => {
    document.cookie = 'locale=es; path=/'
    render(
      <I18nProvider>
        <TranslationProbe translationKey="appName" />
      </I18nProvider>
    )

    expect(screen.getByText('Dash')).toBeInTheDocument()
    document.cookie = 'locale=; path=/; max-age=0'
  })

  it('falls back to the default locale for a key missing in the active locale', () => {
    document.cookie = 'locale=es; path=/'
    render(
      <I18nProvider>
        <TranslationProbe translationKey="missingKey" />
      </I18nProvider>
    )

    expect(screen.getByText('missingKey')).toBeInTheDocument()
    document.cookie = 'locale=; path=/; max-age=0'
  })
})
