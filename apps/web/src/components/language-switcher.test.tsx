import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageSwitcher } from '@/components/language-switcher'
import { I18nProvider } from '@/lib/i18n'

function renderSwitcher() {
  return render(
    <I18nProvider>
      <LanguageSwitcher />
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

  it('renders one button per supported locale', () => {
    renderSwitcher()

    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Spanish' })).toBeInTheDocument()
  })

  it('marks the active locale as pressed', () => {
    renderSwitcher()

    expect(screen.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Spanish' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('switches the locale, persists the cookie and syncs the html lang attribute', async () => {
    const user = userEvent.setup()
    renderSwitcher()

    await user.click(screen.getByRole('button', { name: 'Spanish' }))

    expect(screen.getByRole('button', { name: 'Español' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(document.documentElement.lang).toBe('es')
    expect(document.cookie).toContain('locale=es')
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

    await user.click(screen.getByRole('button', { name: 'Spanish' }))

    expect(screen.getByTestId('path')).toHaveTextContent('/es/pricing?interval=yearly')
  })
})
