import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import ImportMembersPage from '@/pages/ImportMembersPage'
import { server } from '@/test/server'

const ORGANIZATION = `${API_BASE_URL}/api/v1/orgs/:orgSlug`
const IMPORTS = `${API_BASE_URL}/api/v1/orgs/:orgSlug/imports`

const NOW = '2026-01-01T00:00:00.000Z'

function serveOrganization(role = 'owner') {
  server.use(
    http.get(ORGANIZATION, () =>
      HttpResponse.json({
        organization: {
          id: 10,
          name: 'Acme Labs',
          slug: 'acme-labs',
          logoPath: null,
          defaultLocale: 'en',
          onboardedAt: NOW,
          createdAt: NOW,
          updatedAt: NOW,
          role,
        },
      })
    )
  )
}

/**
 * The result of the import, as the API returns it.
 */
function serveImport() {
  server.use(
    http.post(IMPORTS, () =>
      HttpResponse.json(
        {
          import: {
            id: 1,
            fileName: 'team.csv',
            state: 'done',
            totalRows: 3,
            importedRows: 2,
            errors: [
              {
                line: 3,
                email: 'not-an-address',
                reason: 'That is not an email address',
              },
            ],
            createdAt: NOW,
            updatedAt: NOW,
          },
        },
        { status: 201 }
      )
    )
  )
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/app/acme-labs/members/import']}>
          <Routes>
            <Route path="/app/:orgSlug/members/import" element={<ImportMembersPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}

/**
 * The file input of the page. The trigger of the shared component is a
 * button, so the test sets the file on the input it opens.
 */
function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('No file input')
  return input
}

beforeEach(() => {
  document.cookie = 'locale=; path=/; max-age=0'
})

describe('ImportMembersPage', () => {
  it('uploads a CSV and shows the counts and the failed rows', async () => {
    serveOrganization()
    serveImport()
    const user = userEvent.setup()
    const { container } = renderPage()

    const csv = new File(['email,role\nada@example.com\n'], 'team.csv', { type: 'text/csv' })
    await user.upload(fileInput(container), csv)

    expect(screen.getByRole('button', { name: /team\.csv/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Send invitations' }))

    expect(await screen.findByText('2 of 3 rows imported.')).toBeInTheDocument()
    expect(screen.getByText('Rows that could not be imported')).toBeInTheDocument()
    expect(screen.getByText('not-an-address')).toBeInTheDocument()
    expect(screen.getByText('That is not an email address')).toBeInTheDocument()
  })

  it('renders in Spanish and localizes the reason of the API', async () => {
    document.cookie = 'locale=es; path=/'
    serveOrganization()
    serveImport()
    const user = userEvent.setup()
    const { container } = renderPage()

    await user.upload(
      fileInput(container),
      new File(['email,role\nada@example.com\n'], 'team.csv', { type: 'text/csv' })
    )
    await user.click(screen.getByRole('button', { name: 'Enviar invitaciones' }))

    await waitFor(() => expect(screen.getByText('2 de 3 filas importadas.')).toBeInTheDocument())
    expect(screen.getByText('Filas que no se pudieron importar')).toBeInTheDocument()
  })

  it('explains a file that is too large without calling the API', async () => {
    serveOrganization()
    const user = userEvent.setup()
    const { container } = renderPage()

    const big = new File([new Uint8Array(1024 * 1024 + 1)], 'team.csv', { type: 'text/csv' })
    await user.upload(fileInput(container), big)
    await user.click(screen.getByRole('button', { name: 'Send invitations' }))

    expect(await screen.findByText('Choose a CSV of 1 MB or smaller.')).toBeInTheDocument()
  })

  it('hides the form from a member without permission', async () => {
    serveOrganization('member')

    renderPage()

    expect(await screen.findByText('You do not have permission to do that.')).toBeInTheDocument()
  })
})
