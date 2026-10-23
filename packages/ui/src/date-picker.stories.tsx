import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { DatePicker } from './date-picker'

function ControlledDatePicker({
  initial,
  locale,
  placeholder,
}: {
  initial?: Date
  locale?: string
  placeholder?: string
}) {
  const [value, setValue] = useState(initial)

  return (
    <div className="max-w-xs">
      <DatePicker value={value} onChange={setValue} locale={locale} placeholder={placeholder} />
    </div>
  )
}

const meta = {
  title: 'Forms/Date picker',
  component: ControlledDatePicker,
} satisfies Meta<typeof ControlledDatePicker>

export default meta

type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const Selected: Story = { args: { initial: new Date(2026, 2, 14) } }

/**
 * The date follows the conventions of the locale it is given.
 */
export const Spanish: Story = {
  args: { initial: new Date(2026, 2, 14), locale: 'es', placeholder: 'Elige una fecha' },
}
