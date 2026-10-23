import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from './label'
import { RadioGroup, RadioGroupItem } from './radio-group'

const meta = {
  title: 'Forms/Radio group',
  component: RadioGroup,
} satisfies Meta<typeof RadioGroup>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="monthly" aria-label="Billing period">
      <Label>
        <RadioGroupItem value="monthly" />
        Monthly
      </Label>
      <Label>
        <RadioGroupItem value="yearly" />
        Yearly
      </Label>
    </RadioGroup>
  ),
}

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="monthly" aria-label="Billing period" disabled>
      <Label>
        <RadioGroupItem value="monthly" />
        Monthly
      </Label>
      <Label>
        <RadioGroupItem value="yearly" />
        Yearly
      </Label>
    </RadioGroup>
  ),
}
