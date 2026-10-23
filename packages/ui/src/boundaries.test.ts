import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const src = import.meta.dirname

/**
 * The modules of the web app a primitive must never reach: the kit renders
 * the same in the app, in Storybook and in a project that rewrote the app.
 */
const APP_ONLY = [
  /^@\//,
  /^@dash\/(web|api)(\/|$)/,
  /apps\/web/,
  /(^|\/)(pages|providers|layouts|locales)(\/|$)/,
  /(^|\/)lib\/(api|i18n)(\.ts)?$/,
]

/**
 * Every module specifier of a source file: static imports, re-exports,
 * side-effect imports and dynamic imports.
 */
function specifiers(source: string) {
  const found = source.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/gm)
  return [...found].map(([, specifier]) => specifier)
}

async function sourceFiles() {
  const entries = await readdir(src, { recursive: true })
  return entries.filter((entry) => /\.tsx?$/.test(entry) && !entry.endsWith('.test.ts'))
}

/**
 * The imports of a file that leave the package or name an app-only module.
 */
function violations(file: string, source: string) {
  return specifiers(source).filter((specifier) => {
    if (specifier.startsWith('.')) {
      const target = path.resolve(src, path.dirname(file), specifier)
      if (!target.startsWith(src + path.sep)) return true
    }
    return APP_ONLY.some((pattern) => pattern.test(specifier))
  })
}

describe('the boundaries of the kit', () => {
  it('never imports a page, a provider, the API client or a catalog of the app', async () => {
    const found: string[] = []
    for (const file of await sourceFiles()) {
      const source = await readFile(path.join(src, file), 'utf8')
      for (const specifier of violations(file, source)) found.push(`${file}: ${specifier}`)
    }

    expect(found).toEqual([])
  })

  it('recognises an import of the app', () => {
    expect(violations('button.tsx', "import { formatDate } from '@/lib/i18n'")).toHaveLength(1)
    expect(
      violations('button.tsx', "import { client } from '../../../apps/web/src/lib/api'")
    ).toHaveLength(1)
    expect(violations('button.tsx', "import { cn } from './utils'")).toEqual([])
  })
})
