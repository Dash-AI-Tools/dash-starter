import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './input'
import { Label } from './label'

const meta = {
  title: 'Forms/Input',
  component: Input,
  args: { 'placeholder': 'name@example.com', 'type': 'email', 'aria-label': 'Email' },
} satisfies Meta<typeof Input>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithLabel: Story = {
  render: () => (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="story-input">Email</Label>
      <Input id="story-input" type="email" placeholder="name@example.com" />
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div className="grid max-w-sm gap-3">
      <Input aria-label="Disabled" placeholder="Disabled" disabled />
      <Input aria-label="Invalid" defaultValue="not an email" aria-invalid />
      <Input aria-label="File" type="file" />
    </div>
  ),
}
