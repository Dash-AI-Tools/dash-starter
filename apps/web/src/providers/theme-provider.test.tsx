import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from '@/providers/theme-provider'

function ThemeControls() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setTheme('dark')}>
        dark
      </button>
    </div>
  )
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <ThemeControls />
    </ThemeProvider>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('follows the system theme by default', () => {
    renderProvider()

    expect(screen.getByTestId('theme')).toHaveTextContent('system')
  })

  it('applies the dark class when the dark theme is selected', async () => {
    const user = userEvent.setup()
    renderProvider()

    await user.click(screen.getByRole('button', { name: 'dark' }))

    expect(document.documentElement).toHaveClass('dark')
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
  })

  it('persists the selected theme', async () => {
    const user = userEvent.setup()
    renderProvider()

    await user.click(screen.getByRole('button', { name: 'dark' }))

    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
