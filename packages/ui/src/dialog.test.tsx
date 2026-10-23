import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'
import { Button } from './button'

function DialogFixture() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Open the dialog</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete the organization</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <Button>Confirm</Button>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('moves the focus into the dialog and traps it there', async () => {
    const user = userEvent.setup()
    render(<DialogFixture />)

    const trigger = screen.getByRole('button', { name: 'Open the dialog' })
    await user.click(trigger)

    const confirm = await screen.findByRole('button', { name: 'Confirm' })

    await waitFor(() => {
      expect(confirm).toHaveFocus()
    })

    /**
     * Tabbing moves the focus to the next control of the dialog, never to the
     * page behind it.
     */
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
  })

  it('closes on Escape and returns the focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<DialogFixture />)

    const trigger = screen.getByRole('button', { name: 'Open the dialog' })
    await user.click(trigger)

    await screen.findByRole('button', { name: 'Confirm' })
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
    })
    expect(trigger).toHaveFocus()
  })
})
