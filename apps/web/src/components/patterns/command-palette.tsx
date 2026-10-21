import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

/**
 * A group of commands shown in the palette.
 */
export type CommandGroupConfig = {
  /** The name of the group. */
  heading: string
  /** The commands of the group. */
  items: {
    /** The unique identifier of the command. */
    id: string
    /** The label of the command. */
    label: string
    /** The icon shown next to the label. */
    icon?: ReactNode
    /** The text searched when the user types. */
    keywords?: string[]
    /** Called when the command is picked. */
    onSelect: () => void
  }[]
}

/**
 * A palette that groups commands and is opened with the keyboard. The groups
 * are declared by the caller, so every surface can register its own
 * commands.
 */
export function CommandPalette({
  groups,
  title = 'Command palette',
  description = 'Search for a command to run',
  placeholder = 'Type a command or search…',
  open,
  onOpenChange,
}: {
  /** The groups of commands. */
  groups: CommandGroupConfig[]
  /** The accessible title of the dialog. */
  title?: string
  /** The accessible description of the dialog. */
  description?: string
  /** The placeholder of the search input. */
  placeholder?: string
  /** Whether the palette is open. Controlled when provided. */
  open?: boolean
  /** Called when the palette opens or closes. */
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  /**
   * The palette opens with the keyboard shortcut, the same one the search
   * trigger of the app shows.
   */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(!isOpen)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, setOpen])

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={setOpen}
      title={title}
      description={description}
    >
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((item) => (
              <CommandItem
                key={item.id}
                value={[item.label, ...(item.keywords ?? [])].join(' ')}
                onSelect={item.onSelect}
              >
                {item.icon}
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
