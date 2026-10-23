import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { cn } from './utils'

/**
 * A date picker: a button that opens a calendar and reports the day picked.
 * The date is formatted with the conventions of the locale it is given, so the
 * kit needs nothing from the catalogs of the app.
 */
export function DatePicker({
  value,
  onChange,
  locale = 'en',
  placeholder = 'Pick a date',
  className,
}: {
  /** The selected date. */
  value?: Date
  /** Called with the picked date, or `undefined` when the selection is cleared. */
  onChange: (date: Date | undefined) => void
  /** The locale used to format the date, as a BCP 47 tag (`en`, `es`, ...). */
  locale?: string
  /** The label of the button when no date is selected. */
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start font-normal',
              !value && 'text-muted-foreground',
              className
            )}
          />
        }
      >
        <CalendarIcon className="size-4" />
        {value
          ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(value)
          : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
