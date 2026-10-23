import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './checkbox'
import { Input } from './input'
import { Label } from './label'

const meta = {
  title: 'Forms/Label',
  component: Label,
  args: { children: 'Organization name' },
} satisfies Meta<typeof Label>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ForAnInput: Story = {
  render: () => (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="story-label-input">Organization name</Label>
      <Input id="story-label-input" placeholder="Acme" />
    </div>
  ),
}

export const ForACheckbox: Story = {
  render: () => (
    <Label>
      <Checkbox />
      Accept the terms
    </Label>
  ),
}
