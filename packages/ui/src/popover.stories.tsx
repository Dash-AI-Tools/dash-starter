import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from './popover'

const meta = {
  title: 'Overlays/Popover',
  component: Popover,
} satisfies Meta<typeof Popover>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline">Usage</Button>} />
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>AI credits</PopoverTitle>
          <PopoverDescription>420 of 1,000 credits used this month.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
}

export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-16">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Popover key={side}>
          <PopoverTrigger render={<Button variant="outline">{side}</Button>} />
          <PopoverContent side={side}>Opens on the {side}.</PopoverContent>
        </Popover>
      ))}
    </div>
  ),
}
