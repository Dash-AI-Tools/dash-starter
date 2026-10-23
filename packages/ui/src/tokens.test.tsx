import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

const stylesheet = path.resolve(import.meta.dirname, 'styles/index.css')

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

  it('reads the tokens from the palettes of the package, so they have one source', async () => {
    const css = await readFile(stylesheet, 'utf8')

    expect(css).toContain("@import './palettes.css';")
  })

  it('paints the buttons and the links with the primary token', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button').className).toContain('bg-primary')
  })

  it('paints the focus ring with the ring token', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button').className).toContain('ring-ring')
  })
})
