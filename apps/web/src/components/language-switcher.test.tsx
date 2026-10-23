import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageSwitcher } from '@/components/language-switcher'
import { I18nProvider } from '@/lib/i18n'

function renderSwitcher(entry = '/') {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[entry]}>
        <LanguageSwitcher />
      </MemoryRouter>
    </I18nProvider>
  )
}

function CurrentPath() {
  const location = useLocation()
  return <span data-testid="path">{location.pathname + location.search}</span>
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    document.cookie = 'locale=; path=/; max-age=0'
  })

  it('offers a single toggle that names the language it switches to', () => {
    renderSwitcher()

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Switch language to Spanish' })).toBeInTheDocument()
  })

  it('switches the locale with one click and syncs the html lang attribute', async () => {
    const user = userEvent.setup()
    renderSwitcher()

    await user.click(screen.getByRole('button', { name: 'Switch language to Spanish' }))

    expect(screen.getByRole('button', { name: 'Cambiar idioma a Inglés' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('es')
    expect(document.cookie).toContain('locale=es')
  })

  it('switches back to the first language with the next click', async () => {
    const user = userEvent.setup()
    document.cookie = 'locale=es; path=/'
    renderSwitcher()

    await user.click(screen.getByRole('button', { name: 'Cambiar idioma a Inglés' }))

    expect(document.documentElement.lang).toBe('en')
    expect(document.cookie).toContain('locale=en')
  })

  it('keeps the current route and query string', async () => {
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={['/es/pricing?interval=yearly']}>
          <LanguageSwitcher />
          <CurrentPath />
        </MemoryRouter>
      </I18nProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Switch language to Spanish' }))

    expect(screen.getByTestId('path')).toHaveTextContent('/es/pricing?interval=yearly')
  })
})
