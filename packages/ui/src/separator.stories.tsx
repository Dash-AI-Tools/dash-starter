import type { Meta, StoryObj } from '@storybook/react-vite'
import { Separator } from './separator'

const meta = {
  title: 'Data/Separator',
  component: Separator,
} satisfies Meta<typeof Separator>

export default meta

type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: () => (
    <div className="max-w-sm text-sm">
      <p className="font-medium">Acme</p>
      <p className="text-muted-foreground">The organization of the demo.</p>
      <Separator className="my-4" />
      <p>Members, billing and API keys.</p>
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div className="flex h-5 items-center gap-4 text-sm">
      <span>Members</span>
      <Separator orientation="vertical" />
      <span>Billing</span>
      <Separator orientation="vertical" />
      <span>API keys</span>
    </div>
  ),
}
