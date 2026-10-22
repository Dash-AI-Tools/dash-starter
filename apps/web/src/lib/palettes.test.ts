import { beforeEach, describe, expect, it } from 'vitest'
import { isDemoMode } from '@/lib/demo-mode'
import { DEFAULT_PALETTE, resolveInitialPalette } from '@/lib/palettes'

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
