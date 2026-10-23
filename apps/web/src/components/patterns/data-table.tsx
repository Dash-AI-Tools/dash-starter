import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@dash/ui'
import { cn } from '@/lib/utils'

/**
 * The state of the table, kept in the URL so a link to the table restores
 * exactly what the user was looking at.
 */
export type DataTableState = {
  /** The page being shown, starting at 1. */
  page: number
  /** The rows per page. */
  pageSize: number
  /** The column the table is sorted by. */
  sortBy?: string
  /** The direction of the sort. */
  sortDirection?: 'asc' | 'desc'
  /** The text the rows are filtered with. */
  search?: string
  /** The filters applied to the rows, as `column:value` pairs. */
  filters?: Record<string, string>
}

/**
 * A filter the user can pick from a list of values.
 */
export type DataTableFilter = {
  /** The name of the column the filter applies to. */
  column: string
  /** The label of the filter. */
  label: string
  /** The values the user can choose from. */
  options: { value: string; label: string }[]
  /** Called with the chosen value, or an empty string when the filter is cleared. */
  onChange: (value: string) => void
  /** The value currently applied. */
  value?: string
}

/**
 * A data table with sorting, search, filters, pagination, row selection and
 * column visibility. The state lives in the URL, so the table can be shared
 * and reloaded.
 */
export function DataTable<T>({
  columns,
  data,
  total,
  loading,
  error,
  emptyState,
  searchPlaceholder,
  filters = [],
  bulkActions,
  enableRowSelection = false,
  getRowId,
  labels,
  className,
}: {
  /** The columns of the table. */
  columns: ColumnDef<T, unknown>[]
  /** The rows of the current page. */
  data: T[]
  /** The total number of rows, used to paginate. */
  total?: number
  /** Whether the rows are being loaded. */
  loading?: boolean
  /** The error shown instead of the rows. */
  error?: React.ReactNode
  /** Rendered when there are no rows. */
  emptyState?: React.ReactNode
  /** The placeholder of the search input. */
  searchPlaceholder?: string
  /** The filters shown above the table. */
  filters?: DataTableFilter[]
  /** The actions applied to the selected rows. */
  bulkActions?: (selectedIds: string[]) => ReactNode
  /** Whether the rows can be selected. */
  enableRowSelection?: boolean
  /** The stable identifier of a row, needed to keep the selection across pages. */
  getRowId?: (row: T, index: number) => string
  /** The labels of the table controls. */
  labels?: {
    search?: string
    previous?: string
    next?: string
    page?: string
    of?: string
    loading?: string
    selectAll?: string
    selectRow?: string
  }
  className?: string
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const state = useMemo<DataTableState>(
    () => ({
      page: Number(searchParams.get('page') ?? 1),
      pageSize: Number(searchParams.get('pageSize') ?? 20),
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortDirection: (searchParams.get('sortDirection') as 'asc' | 'desc' | null) ?? undefined,
      search: searchParams.get('search') ?? undefined,
      filters: Object.fromEntries(
        [...searchParams.entries()].filter(([key]) => key.startsWith('filter.'))
      ),
    }),
    [searchParams]
  )

  const sorting = useMemo<SortingState>(
    () => (state.sortBy ? [{ id: state.sortBy, desc: state.sortDirection === 'desc' }] : []),
    [state.sortBy, state.sortDirection]
  )

  /**
   * Every change of the table state is written back to the URL, so a reload
   * or a shared link shows the same rows.
   */
  const update = useCallback(
    (changes: Partial<DataTableState>) => {
      const next = { ...state, ...changes }
      const params = new URLSearchParams(searchParams)

      if (next.page > 1) params.set('page', String(next.page))
      else params.delete('page')

      if (next.pageSize !== 20) params.set('pageSize', String(next.pageSize))
      else params.delete('pageSize')

      if (next.sortBy) params.set('sortBy', next.sortBy)
      else params.delete('sortBy')

      if (next.sortDirection) params.set('sortDirection', next.sortDirection)
      else params.delete('sortDirection')

      if (next.search) params.set('search', next.search)
      else params.delete('search')

      for (const key of [...params.keys()]) {
        if (key.startsWith('filter.')) params.delete(key)
      }

      for (const [column, value] of Object.entries(next.filters ?? {})) {
        if (value) params.set(`filter.${column}`, value)
      }

      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams, state]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const first = next[0]
      update({
        sortBy: first?.id,
        sortDirection: first ? (first.desc ? 'desc' : 'asc') : undefined,
        page: 1,
      })
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: getRowId
      ? (row: T, index: number) => getRowId(row, index) ?? String(index)
      : undefined,
    enableRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  })

  /**
   * The search is debounced so typing does not flood the API with requests.
   */
  const [search, setSearch] = useState(state.search ?? '')
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((state.search ?? '') !== search) {
        update({ search: search || undefined, page: 1 })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search, state.search, update])

  const pageCount = total ? Math.max(1, Math.ceil(total / state.pageSize)) : 1
  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])

  return (
    <div data-slot="data-table" className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={labels?.search}
          className="max-w-xs"
        />

        <div className="flex items-center gap-2">
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => (
              <Button
                key={column.id}
                type="button"
                size="xs"
                variant={column.getIsVisible() ? 'secondary' : 'ghost'}
                onClick={() => column.toggleVisibility()}
              >
                {column.id}
              </Button>
            ))}
        </div>
      </div>

      {filters.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <select
              key={filter.column}
              aria-label={filter.label}
              value={filter.value ?? ''}
              onChange={(event) => filter.onChange(event.target.value)}
              className="h-7 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      ) : null}

      {bulkActions && selectedIds.length ? (
        <div className="flex items-center gap-2 rounded-lg border p-2">
          <span className="text-sm text-muted-foreground">{selectedIds.length}</span>
          {bulkActions(selectedIds)}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={
                            header.column.getCanSort()
                              ? header.column.getToggleSortingHandler()
                              : undefined
                          }
                          aria-label={
                            header.column.getCanSort() ? `Sort by ${header.column.id}` : undefined
                          }
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() ? (
                            <span aria-hidden="true">
                              {header.column.getIsSorted() === 'asc'
                                ? '▲'
                                : header.column.getIsSorted() === 'desc'
                                  ? '▼'
                                  : '↕'}
                            </span>
                          ) : null}
                        </button>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {labels?.loading ?? 'Loading…'}
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyState}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {labels?.page ? `${labels.page} ${state.page} ${labels.of ?? ''} ${pageCount}` : null}
        </span>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={state.page <= 1}
            onClick={() => update({ page: state.page - 1 })}
          >
            {labels?.previous ?? 'Previous'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={state.page >= pageCount}
            onClick={() => update({ page: state.page + 1 })}
          >
            {labels?.next ?? 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
