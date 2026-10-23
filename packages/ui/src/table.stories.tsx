import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

const ROWS = [
  { name: 'Ada Lovelace', role: 'Owner', credits: 420 },
  { name: 'Alan Turing', role: 'Admin', credits: 180 },
  { name: 'Grace Hopper', role: 'Member', credits: 95 },
]

const meta = {
  title: 'Data/Table',
  component: Table,
} satisfies Meta<typeof Table>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>The members of the organization.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Credits</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.role}</TableCell>
            <TableCell className="text-right">{row.credits}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell className="text-right">
            {ROWS.reduce((total, row) => total + row.credits, 0)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
}
