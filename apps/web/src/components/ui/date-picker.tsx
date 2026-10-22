import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { formatDate, type Locale } from '@/lib/i18n'

/**
 * A date picker: a button that opens a calendar and reports the day picked.
 * The date is formatted with the conventions of the active locale.
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
  /** The locale used to format the date. */
  locale?: Locale
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
        {value ? formatDate(locale, value, { dateStyle: 'medium' }) : placeholder}
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
