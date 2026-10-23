import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { isDemoMode } from '@/lib/demo-mode'
import { DEFAULT_PALETTE, PALETTE_IDS, resolveInitialPalette } from '@/lib/palettes'

const src = path.resolve(import.meta.dirname, '..')
const stylesheet = createRequire(import.meta.url).resolve('@dash/ui/styles.css')

describe('The initial palette', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is the default of the product when the visitor cannot choose', () => {
    localStorage.setItem('palette', 'plum')

    expect(resolveInitialPalette(false)).toBe(DEFAULT_PALETTE)
  })

  it('is the palette the visitor picked when they can choose', () => {
    localStorage.setItem('palette', 'plum')

    expect(resolveInitialPalette(true)).toBe('plum')
  })

  it('falls back to the default when the stored palette does not exist', () => {
    localStorage.setItem('palette', 'neon')

    expect(resolveInitialPalette(true)).toBe(DEFAULT_PALETTE)
  })
})

describe('Demo mode', () => {
  it('is only on for the literal true', () => {
    expect(isDemoMode('true')).toBe(true)
    expect(isDemoMode(undefined)).toBe(false)
    expect(isDemoMode('')).toBe(false)
    expect(isDemoMode('1')).toBe(false)
    expect(isDemoMode('TRUE')).toBe(false)
  })
})

/**
 * The tokens live in `@dash/ui` only: the app imports its stylesheet and has
 * none of its own, so a token changed in the package is the token of the app.
 */
describe('The tokens of the app', () => {
  it('come from the stylesheet of the UI package', async () => {
    const main = await readFile(path.join(src, 'main.tsx'), 'utf8')

    expect(main).toContain("import '@dash/ui/styles.css'")
  })

  it('have no second copy in the app', async () => {
    const files = await readdir(src, { recursive: true })

    expect(files.filter((file) => file.endsWith('.css'))).toEqual([])
  })

  it('name the palettes the package declares', async () => {
    const css = await readFile(path.join(path.dirname(stylesheet), 'palettes.css'), 'utf8')
    const declared = new Set([...css.matchAll(/data-palette='([a-z]+)'/g)].map(([, id]) => id))

    expect([...declared]).toEqual([...PALETTE_IDS])
  })
})
