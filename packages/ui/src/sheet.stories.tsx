import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'

const meta = {
  title: 'Overlays/Sheet',
  component: Sheet,
} satisfies Meta<typeof Sheet>

export default meta

type Story = StoryObj<typeof meta>

const SIDES = ['top', 'right', 'bottom', 'left'] as const

export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {SIDES.map((side) => (
        <Sheet key={side}>
          <SheetTrigger render={<Button variant="outline">Open from the {side}</Button>} />
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>A panel sliding from the {side} of the screen.</SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose render={<Button>Apply</Button>} />
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
}
