import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from './label'
import { Switch } from './switch'

const meta = {
  title: 'Forms/Switch',
  component: Switch,
  args: { 'aria-label': 'Email notifications' },
  argTypes: { size: { control: 'inline-radio', options: ['default', 'sm'] } },
} satisfies Meta<typeof Switch>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Checked: Story = { args: { defaultChecked: true } }

export const Variants: Story = {
  render: () => (
    <div className="grid gap-3">
      <Label>
        <Switch defaultChecked />
        Default
      </Label>
      <Label>
        <Switch size="sm" defaultChecked />
        Small
      </Label>
      <Label>
        <Switch disabled />
        Disabled
      </Label>
    </div>
  ),
}
