import { test } from '@japa/runner'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import { SUPPORTED_LOCALES } from '#app/locales'

/**
 * Reads every catalog file of a locale and returns the flattened keys, so a
 * missing translation in one locale fails the build. Catalog files hold
 * either a flat map of messages or a namespace of nested messages.
 */
async function localeKeys(locale: string) {
  const directory = join(app.languageFilesPath(), locale)
  const files = await readdir(directory)
  const keys: string[] = []

  for (const file of files) {
    const contents: Record<string, unknown> = JSON.parse(
      await readFile(join(directory, file), 'utf-8')
    )
    for (const [namespace, entries] of Object.entries(contents)) {
      if (typeof entries === 'string') {
        keys.push(namespace)
        continue
      }

      for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
        if (value !== null && typeof value === 'object') {
          for (const nested of Object.keys(value)) {
            keys.push(`${namespace}.${key}.${nested}`)
          }
          continue
        }
        keys.push(`${namespace}.${key}`)
      }
    }
  }

  return keys.sort()
}

test.group('Translation catalogs', () => {
  test('every locale has the same keys', async ({ assert }) => {
    const [reference, ...others] = await Promise.all(SUPPORTED_LOCALES.map(localeKeys))

    for (const keys of others) {
      const missing = reference.filter((key) => !keys.includes(key))
      const extra = keys.filter((key) => !reference.includes(key))

      assert.deepEqual(missing, [], 'Missing keys in the Spanish catalog')
      assert.deepEqual(extra, [], 'Unexpected keys in the Spanish catalog')
    }
  })

  test('the reference catalog is not empty', async ({ assert }) => {
    const keys = await localeKeys('en')

    assert.isAbove(keys.length, 0)
  })
})
