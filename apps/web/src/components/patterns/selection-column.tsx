import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'

/**
 * A column that selects the row it belongs to. It has to be part of the
 * columns of the table, so the selection is rendered in the right place.
 *
 * The column never reads the row, but the type has to match the row type of
 * the table it is added to, so the caller names it.
 */
export function selectionColumn<T>(labels?: {
  selectAll?: string
  selectRow?: string
}): ColumnDef<T, unknown> {
  return {
    id: 'select',
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        aria-label={labels?.selectAll ?? 'Select all the rows'}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        aria-label={labels?.selectRow ?? 'Select the row'}
        onCheckedChange={(value) => row.toggleSelected(value === true)}
      />
    ),
  }
}
