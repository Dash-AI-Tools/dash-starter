import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { CreditCardIcon, SettingsIcon, UsersIcon } from 'lucide-react'
import { Button } from './button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command'

const meta = {
  title: 'Forms/Command',
  component: Command,
} satisfies Meta<typeof Command>

export default meta

type Story = StoryObj<typeof meta>

function Items() {
  return (
    <CommandList>
      <CommandEmpty>No results.</CommandEmpty>
      <CommandGroup heading="Organization">
        <CommandItem>
          <UsersIcon />
          Members
        </CommandItem>
        <CommandItem>
          <CreditCardIcon />
          Billing
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Account">
        <CommandItem>
          <SettingsIcon />
          Settings
          <CommandShortcut>⌘S</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  )
}

function DialogCommand() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open the command menu
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Type a command…" />
          <Items />
        </Command>
      </CommandDialog>
    </>
  )
}

export const Inline: Story = {
  render: () => (
    <Command className="max-w-sm rounded-lg border">
      <CommandInput placeholder="Type a command…" />
      <Items />
    </Command>
  ),
}

export const InADialog: Story = { render: () => <DialogCommand /> }
