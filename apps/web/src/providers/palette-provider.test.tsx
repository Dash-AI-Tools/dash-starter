import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PALETTE } from '@/lib/palettes'
import { PaletteProvider, usePalette } from '@/providers/palette-provider'
import { ThemeProvider, useTheme } from '@/providers/theme-provider'

function Controls() {
  const { palette, setPalette } = usePalette()
  const { setTheme } = useTheme()

  return (
    <div>
      <span data-testid="palette">{palette}</span>
      <button type="button" onClick={() => setPalette('ember')}>
        ember
      </button>
      <button type="button" onClick={() => setTheme('dark')}>
        dark
      </button>
    </div>
  )
}

function renderProvider(canChoose: boolean) {
  return render(
    <ThemeProvider>
      <PaletteProvider canChoose={canChoose}>
        <Controls />
      </PaletteProvider>
    </ThemeProvider>
  )
}

describe('PaletteProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.palette
  })

  it('paints the document with the default palette', () => {
    renderProvider(false)

    expect(document.documentElement.dataset.palette).toBe(DEFAULT_PALETTE)
  })

  it('applies and remembers the pick in demo mode, without touching dark mode', async () => {
    const user = userEvent.setup()
    renderProvider(true)

    await user.click(screen.getByRole('button', { name: 'ember' }))

    expect(document.documentElement.dataset.palette).toBe('ember')
    expect(localStorage.getItem('palette')).toBe('ember')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('keeps the palette when the visitor switches to dark mode', async () => {
    const user = userEvent.setup()
    renderProvider(true)

    await user.click(screen.getByRole('button', { name: 'ember' }))
    await user.click(screen.getByRole('button', { name: 'dark' }))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.palette).toBe('ember')
  })

  it('ignores picks and stored palettes outside demo mode', async () => {
    const user = userEvent.setup()
    localStorage.setItem('palette', 'plum')
    renderProvider(false)

    await user.click(screen.getByRole('button', { name: 'ember' }))

    expect(screen.getByTestId('palette')).toHaveTextContent(DEFAULT_PALETTE)
    expect(document.documentElement.dataset.palette).toBe(DEFAULT_PALETTE)
    expect(localStorage.getItem('palette')).toBe('plum')
  })
})
