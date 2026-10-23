import type { Meta, StoryObj } from '@storybook/react-vite'
import { UsersIcon } from 'lucide-react'
import { Button } from './button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from './empty'

const meta = {
  title: 'Feedback/Empty',
  component: Empty,
} satisfies Meta<typeof Empty>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UsersIcon />
        </EmptyMedia>
        <EmptyTitle>No members yet</EmptyTitle>
        <EmptyDescription>Invite the first member of the organization.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Invite a member</Button>
      </EmptyContent>
    </Empty>
  ),
}

export const WithoutMedia: Story = {
  render: () => (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>Nothing here yet</EmptyTitle>
        <EmptyDescription>Create the first record to fill this space.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
}
