import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Command,
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
    /** The extra line shown under the label. */
    description?: string
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
 *
 * The optional `search` runs against the records of the features that
 * registered a search provider, and its groups are shown under the declared
 * ones.
 */
export function CommandPalette({
  groups,
  search,
  title = 'Command palette',
  description = 'Search for a command to run',
  placeholder = 'Type a command or search…',
  open,
  onOpenChange,
}: {
  /** The groups of commands. */
  groups: CommandGroupConfig[]
  /** The groups of the records found by the registered search providers. */
  search?: (query: string) => Promise<CommandGroupConfig[]>
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

  const [query, setQuery] = useState('')
  const [result, setResult] = useState<{ query: string; groups: CommandGroupConfig[] }>({
    query: '',
    groups: [],
  })

  /**
   * The records of the last search. They are shown only when they belong to
   * the current query, so the results of an older search never appear.
   */
  const found = result.query === query ? result.groups : []

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

  /**
   * The records of the features are looked up as the user types, with a
   * short delay so every keystroke does not hit the API.
   */
  useEffect(() => {
    if (!search || query.trim().length === 0) return

    let cancelled = false
    const timer = setTimeout(async () => {
      const groups = await search(query)
      if (!cancelled) setResult({ query, groups })
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, search])

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen} title={title} description={description}>
      <Command>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the palette only exists while the user is typing in it */}
        <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} autoFocus />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {[...groups, ...found].map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={[item.label, ...(item.keywords ?? [])].join(' ')}
                  onSelect={item.onSelect}
                >
                  {item.icon}
                  <span className="flex flex-col">
                    <span>{item.label}</span>
                    {item.description ? (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
