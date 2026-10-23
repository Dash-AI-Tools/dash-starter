import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FileUpload } from './file-upload'

const meta = {
  title: 'Forms/File upload',
  component: FileUpload,
  args: { onFilesChange: fn(), label: 'Attachment' },
} satisfies Meta<typeof FileUpload>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithHint: Story = {
  args: { hint: 'PDF or PNG, up to 5 MB', accept: '.pdf,image/png' },
}
