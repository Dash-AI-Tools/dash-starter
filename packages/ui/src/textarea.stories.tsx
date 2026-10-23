import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from './label'
import { Textarea } from './textarea'

const meta = {
  title: 'Forms/Textarea',
  component: Textarea,
  args: { 'placeholder': 'Write a message', 'aria-label': 'Message' },
} satisfies Meta<typeof Textarea>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithLabel: Story = {
  render: () => (
    <div className="grid max-w-sm gap-2">
      <Label htmlFor="story-textarea">Message</Label>
      <Textarea id="story-textarea" placeholder="Write a message" />
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div className="grid max-w-sm gap-3">
      <Textarea aria-label="Disabled" placeholder="Disabled" disabled />
      <Textarea aria-label="Invalid" defaultValue="Too short" aria-invalid />
    </div>
  ),
}
