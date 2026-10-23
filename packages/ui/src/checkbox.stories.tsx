import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './checkbox'
import { Label } from './label'

const meta = {
  title: 'Forms/Checkbox',
  component: Checkbox,
  args: { 'aria-label': 'Accept the terms' },
} satisfies Meta<typeof Checkbox>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = { args: { defaultChecked: true } }

export const States: Story = {
  render: () => (
    <div className="grid gap-3">
      <Label>
        <Checkbox />
        Unchecked
      </Label>
      <Label>
        <Checkbox defaultChecked />
        Checked
      </Label>
      <Label>
        <Checkbox indeterminate />
        Indeterminate
      </Label>
      <Label>
        <Checkbox disabled />
        Disabled
      </Label>
      <Label>
        <Checkbox aria-invalid />
        Invalid
      </Label>
    </div>
  ),
}
