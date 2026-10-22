import type { TranslationKey } from '@/lib/i18n'

/**
 * The colour palettes the product ships with. Each one is a full set of
 * design tokens in `styles/palettes.css`, applied with `data-palette` on the
 * document root.
 */
export const PALETTE_IDS = ['line', 'ink', 'ocean', 'forest', 'plum', 'ember'] as const

export type PaletteId = (typeof PALETTE_IDS)[number]

/**
 * The palette every visitor sees. The installer sets it when the project is
 * created; change it here to re-colour the whole product.
 */
export const DEFAULT_PALETTE: PaletteId = 'line'

/**
 * The name of each palette, as a key of the catalog.
 */
export const PALETTE_LABELS: Record<PaletteId, TranslationKey> = {
  line: 'paletteLine',
  ink: 'paletteInk',
  ocean: 'paletteOcean',
  forest: 'paletteForest',
  plum: 'palettePlum',
  ember: 'paletteEmber',
}

/**
 * The key that remembers the palette a visitor picked in demo mode.
 */
const PALETTE_STORAGE_KEY = 'palette'

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTE_IDS.includes(value as PaletteId)
}

/**
 * The palette to start with: the one the visitor picked when they are allowed
 * to choose, otherwise the default of the product.
 */
export function resolveInitialPalette(canChoose: boolean): PaletteId {
  if (!canChoose) return DEFAULT_PALETTE

  const stored = readStoredPalette()

  return isPaletteId(stored) ? stored : DEFAULT_PALETTE
}

/**
 * The palette stored in this browser, if storage is available at all.
 */
function readStoredPalette(): string | null {
  try {
    return localStorage.getItem(PALETTE_STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Remembers the palette a visitor picked, in this browser only.
 */
export function storePalette(palette: PaletteId): void {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, palette)
  } catch {
    // Storage can be unavailable (private mode); the pick still applies.
  }
}

/**
 * Paints the document with a palette.
 */
export function applyPalette(palette: PaletteId): void {
  document.documentElement.dataset.palette = palette
}
