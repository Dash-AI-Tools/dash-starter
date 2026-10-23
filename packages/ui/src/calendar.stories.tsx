import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from './calendar'

const meta = {
  title: 'Forms/Calendar',
  component: Calendar,
} satisfies Meta<typeof Calendar>

export default meta

type Story = StoryObj<typeof meta>

function SingleCalendar() {
  const [selected, setSelected] = useState<Date | undefined>(new Date(2026, 2, 14))

  return (
    <Calendar
      mode="single"
      defaultMonth={new Date(2026, 2)}
      selected={selected}
      onSelect={setSelected}
      className="rounded-lg border"
    />
  )
}

function RangeCalendar() {
  const [selected, setSelected] = useState<DateRange | undefined>({
    from: new Date(2026, 2, 9),
    to: new Date(2026, 2, 13),
  })

  return (
    <Calendar
      mode="range"
      defaultMonth={new Date(2026, 2)}
      numberOfMonths={2}
      selected={selected}
      onSelect={setSelected}
      className="rounded-lg border"
    />
  )
}

export const Single: Story = { render: () => <SingleCalendar /> }

export const Range: Story = { render: () => <RangeCalendar /> }

export const DropdownCaption: Story = {
  render: () => (
    <Calendar
      mode="single"
      captionLayout="dropdown"
      defaultMonth={new Date(2026, 2)}
      className="rounded-lg border"
    />
  ),
}
