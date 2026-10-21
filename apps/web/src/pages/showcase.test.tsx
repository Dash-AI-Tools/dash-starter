import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '@/lib/i18n'
import ShowcasePage from '@/pages/ShowcasePage'

function renderShowcase() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <ShowcasePage />
      </I18nProvider>
    </MemoryRouter>
  )
}

describe('ShowcasePage', () => {
  it('renders every component of the inventory', () => {
    const { container } = renderShowcase()

    // Buttons, inputs and overlays.
    expect(screen.getByRole('button', { name: 'Default' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Destructive' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeInTheDocument()
    expect(screen.getByLabelText('Input')).toBeInTheDocument()
    expect(screen.getByLabelText('Textarea')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Select' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Combobox' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Accept the terms' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Owner' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Enable notifications' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pick a date' })).toBeInTheDocument()
    expect(screen.getByText('Attachment')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dialog' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sheet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dropdown menu' })).toBeInTheDocument()
    expect(screen.getByText('Right click here')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Popover' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tooltip' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'One' })).toBeInTheDocument()

    // Feedback and data display.
    expect(container.querySelector('[data-slot="badge"]')).toBeInTheDocument()
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getAllByRole('table')).toHaveLength(2)
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('figure', { name: 'Signups' })).toHaveLength(4)

    // Command palette and search input.
    expect(screen.getByPlaceholderText('Type a command…')).toBeInTheDocument()
  })
})
