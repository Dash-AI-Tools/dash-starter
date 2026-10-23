import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from './combobox'

type Role = { value: string; label: string }

const ROLES: Role[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'billing', label: 'Billing manager' },
]

function RoleCombobox({ showClear = false }: { showClear?: boolean }) {
  return (
    <Combobox items={ROLES}>
      <ComboboxInput aria-label="Role" placeholder="Search a role" showClear={showClear} />
      <ComboboxContent>
        <ComboboxEmpty>No role found</ComboboxEmpty>
        <ComboboxList>
          {(role: Role) => (
            <ComboboxItem key={role.value} value={role.value}>
              {role.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

const meta = {
  title: 'Forms/Combobox',
  component: RoleCombobox,
} satisfies Meta<typeof RoleCombobox>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Clearable: Story = { args: { showClear: true } }
