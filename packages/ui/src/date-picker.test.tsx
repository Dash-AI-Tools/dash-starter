import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DatePicker } from './date-picker'

const DAY = new Date(2026, 2, 14)

/**
 * The date picker formats the day itself, from its `locale` prop, so it needs
 * nothing from the catalogs of the app.
 */
describe('DatePicker', () => {
  it('formats the selected day with the conventions of its locale', () => {
    render(<DatePicker value={DAY} onChange={() => {}} locale="es" />)

    expect(screen.getByRole('button')).toHaveTextContent(
      new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(DAY)
    )
  })

  it('formats in English when no locale is given', () => {
    render(<DatePicker value={DAY} onChange={() => {}} />)

    expect(screen.getByRole('button')).toHaveTextContent('Mar 14, 2026')
  })

  it('shows the placeholder until a day is picked', () => {
    render(<DatePicker onChange={() => {}} placeholder="Pick a date" />)

    expect(screen.getByRole('button')).toHaveTextContent('Pick a date')
  })
})
