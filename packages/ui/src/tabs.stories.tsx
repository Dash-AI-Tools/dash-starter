import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

const meta = {
  title: 'Navigation/Tabs',
  component: Tabs,
} satisfies Meta<typeof Tabs>

export default meta

type Story = StoryObj<typeof meta>

function Sample({ variant }: { variant?: 'default' | 'line' }) {
  return (
    <Tabs defaultValue="general" className="max-w-md">
      <TabsList variant={variant}>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="keys" disabled>
          API keys
        </TabsTrigger>
      </TabsList>
      <TabsContent value="general">The name and the logo of the organization.</TabsContent>
      <TabsContent value="billing">The plan, the invoices and the payment method.</TabsContent>
      <TabsContent value="keys">The keys of the MCP server.</TabsContent>
    </Tabs>
  )
}

export const Default: Story = { render: () => <Sample /> }

export const Line: Story = { render: () => <Sample variant="line" /> }

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="profile" orientation="vertical" className="max-w-md">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">Your name and your language.</TabsContent>
      <TabsContent value="security">Your password and your sessions.</TabsContent>
    </Tabs>
  ),
}
