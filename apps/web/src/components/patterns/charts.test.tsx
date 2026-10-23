import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LineChartCard } from '@/components/patterns/charts'
import { formatNumber } from '@/lib/i18n'

const data = [
  { label: 'January', value: 1234.5 },
  { label: 'February', value: 2345 },
]

describe('charts', () => {
  it('formats the axis numbers with the conventions of the locale', () => {
    expect(formatNumber('es', 1234.5)).toBe('1234,5')
    expect(formatNumber('en', 1234.5)).toBe('1,234.5')
  })

  it('renders a chart with an accessible label', () => {
    render(<LineChartCard data={data} seriesName="Signups" />)

    expect(screen.getByRole('figure', { name: 'Signups' })).toBeInTheDocument()
  })

  it('paints the series with the chart tokens', async () => {
    /**
     * The chart of Recharts needs a measured container, so the colors are read
     * from the source of the component.
     */
    const source = await readFile(path.resolve(import.meta.dirname, 'charts.tsx'), 'utf8')

    expect(source).toContain('var(--chart-1)')
  })
})
