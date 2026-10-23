import type { Meta, StoryObj } from '@storybook/react-vite'
import { toast } from 'sonner'
import { Button } from './button'
import { Toaster } from './sonner'

const meta = {
  title: 'Feedback/Toaster',
  component: Toaster,
} satisfies Meta<typeof Toaster>

export default meta

type Story = StoryObj<typeof meta>

export const Kinds: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast('The invitation was sent.')}>Default</Button>
      <Button
        variant="outline"
        onClick={() => toast.success('Saved', { description: 'The change was stored.' })}
      >
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.info('A new version is available.')}>
        Info
      </Button>
      <Button variant="outline" onClick={() => toast.warning('90% of the credits are used.')}>
        Warning
      </Button>
      <Button variant="destructive" onClick={() => toast.error('Something went wrong')}>
        Error
      </Button>
      <Toaster {...args} />
    </div>
  ),
}
