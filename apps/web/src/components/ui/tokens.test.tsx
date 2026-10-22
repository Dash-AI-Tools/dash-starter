import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '@/components/ui/button'

const stylesheet = path.resolve(import.meta.dirname, '../../index.css')

/**
 * The components take their colors from the tokens of the stylesheet, so a
 * rebranding only needs to change the tokens and not a single component.
 */
describe('the tokens of the theme', () => {
  it('turns the tokens of the stylesheet into the colors of Tailwind', async () => {
    const css = await readFile(stylesheet, 'utf8')

    expect(css).toContain('--color-primary: var(--primary);')
    expect(css).toContain('--color-ring: var(--ring);')
    expect(css).toContain('--color-chart-1: var(--chart-1);')
  })

  it('paints the buttons and the links with the primary token', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button').className).toContain('bg-primary')
  })

  it('paints the focus ring with the ring token', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button').className).toContain('ring-ring')
  })

  it('paints the charts with the chart tokens', async () => {
    /**
     * The chart of Recharts needs a measured container, so the colors are read
     * from the source of the component.
     */
    const source = await readFile(
      path.resolve(import.meta.dirname, '../patterns/charts.tsx'),
      'utf8'
    )

    expect(source).toContain('var(--chart-1)')
  })
})
