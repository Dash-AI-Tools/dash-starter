import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from '@/components/theme-toggle'
import { I18nProvider } from '@/lib/i18n'
import { ThemeProvider } from '@/providers/theme-provider'

function renderToggle() {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    </I18nProvider>
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.cookie = 'locale=; path=/; max-age=0'
    document.documentElement.classList.remove('dark')
  })

  it('offers a single button named by its action', () => {
    renderToggle()

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Toggle light and dark theme' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle light and dark theme' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('flips the document to dark and remembers the choice', async () => {
    const user = userEvent.setup()
    renderToggle()

    await user.click(screen.getByRole('button', { name: 'Toggle light and dark theme' }))

    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Toggle light and dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('flips back to light with the next click', async () => {
    const user = userEvent.setup()
    localStorage.setItem('theme', 'dark')
    renderToggle()

    expect(document.documentElement).toHaveClass('dark')

    await user.click(screen.getByRole('button', { name: 'Toggle light and dark theme' }))

    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('light')
  })
})
