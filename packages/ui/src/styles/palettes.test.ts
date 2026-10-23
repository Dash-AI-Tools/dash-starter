import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

type Mode = 'light' | 'dark'
type Tokens = Map<string, string>

/**
 * The palettes as the stylesheet declares them: one token set per palette
 * and mode, read from the selectors of each block.
 */
function parsePalettes(source: string) {
  const palettes = new Map<string, Record<Mode, Tokens>>()
  const blocks = source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)

  for (const [, selectors, body] of blocks) {
    const name = /data-palette='([a-z]+)'/.exec(selectors)?.[1]
    if (!name) continue

    const mode: Mode = selectors.includes('.dark') ? 'dark' : 'light'
    const tokens: Tokens = new Map()
    for (const [, key, value] of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
      tokens.set(key, value.trim())
    }

    const entry = palettes.get(name) ?? { light: new Map(), dark: new Map() }
    entry[mode] = tokens
    palettes.set(name, entry)
  }

  return palettes
}

/**
 * The linear sRGB channels of an `oklch(L C h)` value, clamped to the gamut.
 */
function oklchToLinearRgb(value: string): [number, number, number] {
  const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value)
  if (!match) throw new Error(`Not an opaque oklch colour: ${value}`)

  const [l, c, h] = match.slice(1).map(Number)
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)

  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  const clamp = (x: number) => Math.min(1, Math.max(0, x))
  return [
    clamp(4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp),
    clamp(-1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp),
    clamp(-0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp),
  ]
}

/**
 * The WCAG contrast ratio of two colours.
 */
function contrast(first: string, second: string): number {
  const luminance = (value: string) => {
    const [r, g, b] = oklchToLinearRgb(value)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [high, low] = [luminance(first), luminance(second)].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/**
 * The distance between two colours in Oklab, where 0.05 is a clearly visible
 * difference.
 */
function distance(first: string, second: string): number {
  const lab = (value: string) => {
    const [l, c, h] = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value)!.slice(1).map(Number)
    return [l, c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180)]
  }
  const [a, b] = [lab(first), lab(second)]
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

const PALETTES = parsePalettes(
  readFileSync(path.resolve(import.meta.dirname, 'palettes.css'), 'utf8')
)
const REQUIRED = [...PALETTES.get('line')!.light.keys()]
const STATIONS = ['auth', 'orgs', 'billing', 'ai', 'mcp', 'email']

/**
 * The pairs that carry text or mark interactive elements, with the ratio
 * WCAG 2.1 AA asks of them.
 */
const PAIRS: [string, string, number][] = [
  ['foreground', 'background', 4.5],
  ['foreground', 'card', 4.5],
  ['muted-foreground', 'background', 4.5],
  ['primary-foreground', 'primary', 4.5],
  ['command-foreground', 'command', 4.5],
  ['ring', 'background', 3],
  ...STATIONS.map((station): [string, string, number] => [`station-${station}`, 'background', 3]),
]

describe('The colour palettes', () => {
  it('ships the six palettes', () => {
    expect([...PALETTES.keys()]).toEqual(['line', 'ink', 'ocean', 'forest', 'plum', 'ember'])
  })

  for (const [name, modes] of PALETTES) {
    for (const mode of ['light', 'dark'] as const) {
      const tokens = modes[mode]

      describe(`${name} in ${mode} mode`, () => {
        it('defines every token, so nothing falls back to another palette', () => {
          expect(REQUIRED.filter((key) => !tokens.has(key))).toEqual([])
        })

        it.each(PAIRS)('%s on %s reaches %s:1', (front, back, minimum) => {
          expect(contrast(tokens.get(front)!, tokens.get(back)!)).toBeGreaterThanOrEqual(minimum)
        })

        it('keeps the six stations distinct from each other', () => {
          for (const [index, first] of STATIONS.entries()) {
            for (const second of STATIONS.slice(index + 1)) {
              expect(
                distance(tokens.get(`station-${first}`)!, tokens.get(`station-${second}`)!),
                `${first} and ${second}`
              ).toBeGreaterThanOrEqual(0.05)
            }
          }
        })
      })
    }
  }
})
