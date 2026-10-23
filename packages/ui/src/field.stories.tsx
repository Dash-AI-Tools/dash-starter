import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './checkbox'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from './field'
import { Input } from './input'
import { Switch } from './switch'

const meta = {
  title: 'Forms/Field',
  component: Field,
} satisfies Meta<typeof Field>

export default meta

type Story = StoryObj<typeof meta>

export const Vertical: Story = {
  render: () => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="story-field-name">Organization name</FieldLabel>
      <Input id="story-field-name" placeholder="Acme" />
      <FieldDescription>Shown to every member of the organization.</FieldDescription>
    </Field>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal" className="max-w-sm">
      <Switch id="story-field-switch" />
      <FieldContent>
        <FieldLabel htmlFor="story-field-switch">Email notifications</FieldLabel>
        <FieldDescription>A mail when someone joins the organization.</FieldDescription>
      </FieldContent>
    </Field>
  ),
}

export const Invalid: Story = {
  render: () => (
    <Field data-invalid className="max-w-sm">
      <FieldLabel htmlFor="story-field-email">Email</FieldLabel>
      <Input id="story-field-email" defaultValue="not an email" aria-invalid />
      <FieldError errors={[{ message: 'Enter a valid email address.' }]} />
    </Field>
  ),
}

export const Grouped: Story = {
  render: () => (
    <FieldSet className="max-w-sm">
      <FieldLegend>Notifications</FieldLegend>
      <FieldDescription>Choose what reaches your inbox.</FieldDescription>
      <FieldGroup>
        <Field orientation="horizontal">
          <Checkbox id="story-field-invites" defaultChecked />
          <FieldLabel htmlFor="story-field-invites">Invitations</FieldLabel>
        </Field>
        <FieldSeparator />
        <Field orientation="horizontal">
          <Checkbox id="story-field-billing" />
          <FieldLabel htmlFor="story-field-billing">Billing</FieldLabel>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
}
