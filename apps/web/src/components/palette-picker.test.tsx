import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { PalettePicker } from '@/components/palette-picker'
import { I18nProvider } from '@/lib/i18n'
import { PaletteProvider } from '@/providers/palette-provider'

function renderPicker(canChoose: boolean) {
  return render(
    <I18nProvider>
      <PaletteProvider canChoose={canChoose}>
        <PalettePicker />
      </PaletteProvider>
    </I18nProvider>
  )
}

describe('PalettePicker', () => {
  beforeEach(() => {
    localStorage.clear()
    document.cookie = 'locale=; path=/; max-age=0'
    delete document.documentElement.dataset.palette
  })

  it('renders nothing outside demo mode', () => {
    const { container } = renderPicker(false)

    expect(container).toBeEmptyDOMElement()
  })

  it('re-colours the page at once when a palette is picked', async () => {
    const user = userEvent.setup()
    renderPicker(true)

    await user.click(screen.getByRole('button', { name: 'Color palette: Line' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Plum' }))

    expect(document.documentElement.dataset.palette).toBe('plum')
    expect(screen.getByRole('button', { name: 'Color palette: Plum' })).toBeInTheDocument()
  })

  it('announces the palette in use as checked', async () => {
    const user = userEvent.setup()
    renderPicker(true)

    await user.click(screen.getByRole('button', { name: 'Color palette: Line' }))

    expect(await screen.findByRole('menuitemradio', { name: 'Line' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByRole('menuitemradio', { name: 'Ocean' })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup()
    renderPicker(true)

    screen.getByRole('button', { name: 'Color palette: Line' }).focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('menuitemradio', { name: 'Line' })
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(document.documentElement.dataset.palette).toBe('ocean')
  })

  it('names the palettes in Spanish', async () => {
    document.cookie = 'locale=es; path=/'
    const user = userEvent.setup()
    renderPicker(true)

    await user.click(screen.getByRole('button', { name: 'Paleta de colores: Línea' }))

    expect(await screen.findByRole('menuitemradio', { name: 'Brasa' })).toBeInTheDocument()
  })
})
