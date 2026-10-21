import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { DataTable } from '@/components/patterns/data-table'
import { selectionColumn } from '@/components/patterns/selection-column'

type Member = { id: number; name: string; role: string }

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'role', header: 'Role' },
] as const

const members: Member[] = [
  { id: 1, name: 'Ada Lovelace', role: 'owner' },
  { id: 2, name: 'Alan Turing', role: 'admin' },
]

function CurrentSearch() {
  const location = useLocation()
  return <span data-testid="search">{location.search}</span>
}

function renderTable(initialEntry: string, data: Member[] = members, total = data.length) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DataTable
        columns={[...columns]}
        data={data}
        total={total}
        emptyState="No members found"
        labels={{ search: 'Search' }}
      />
      <CurrentSearch />
    </MemoryRouter>
  )
}

describe('DataTable', () => {
  it('reads the sort, page and search from the URL', () => {
    renderTable('/members?page=2&sortBy=name&sortDirection=desc&search=ada')

    expect(screen.getByTestId('search')).toHaveTextContent(
      '?page=2&sortBy=name&sortDirection=desc&search=ada'
    )
    expect(screen.getByLabelText('Search')).toHaveValue('ada')
  })

  it('writes the page to the URL when paginating', async () => {
    const user = userEvent.setup()
    renderTable('/members?page=1', members, 50)

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByTestId('search')).toHaveTextContent('page=2')
  })

  it('writes the sort back to the URL', async () => {
    const user = userEvent.setup()
    renderTable('/members')

    await user.click(screen.getByRole('button', { name: 'Sort by name' }))

    expect(screen.getByTestId('search')).toHaveTextContent('sortBy=name')
    expect(screen.getByTestId('search')).toHaveTextContent('sortDirection=asc')
  })

  it('shows the empty state when there are no rows', () => {
    renderTable('/members', [])

    expect(screen.getByText('No members found')).toBeInTheDocument()
  })

  it('selects the rows and offers the bulk actions', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/members']}>
        <DataTable<Member>
          columns={[selectionColumn<Member>(), ...columns]}
          data={members}
          total={members.length}
          enableRowSelection
          getRowId={(row: Member) => String(row.id)}
          bulkActions={(ids) => <button type="button">Archive {ids.join(',')}</button>}
          labels={{ search: 'Search' }}
        />
      </MemoryRouter>
    )

    await user.click(screen.getAllByRole('checkbox', { name: 'Select the row' })[0])

    expect(screen.getByRole('button', { name: 'Archive 1' })).toBeInTheDocument()
  })
})
