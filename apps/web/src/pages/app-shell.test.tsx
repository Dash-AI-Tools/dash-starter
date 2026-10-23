import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import { PaletteProvider } from '@/providers/palette-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import AppLayout from '@/layouts/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import { server } from '@/test/server'

const SESSION = `${API_BASE_URL}/api/v1/auth/session`
const ORGANIZATIONS = `${API_BASE_URL}/api/v1/orgs`
const ORGANIZATION = `${API_BASE_URL}/api/v1/orgs/:orgSlug`
const MEMBERS = `${API_BASE_URL}/api/v1/orgs/:orgSlug/members`
const REMEMBER = `${API_BASE_URL}/api/v1/account/organization`

const NOW = '2026-01-01T00:00:00.000Z'

const user = {
  id: 1,
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: NOW,
  locale: 'en',
  theme: 'system',
  palette: null,
  avatarPath: null,
  pendingEmail: null,
  termsVersion: '2026-01-01',
  lastOrganizationId: 10,
  createdAt: NOW,
  updatedAt: NOW,
  initials: 'AL',
}

const people = {
  ada: { id: 1, fullName: 'Ada Lovelace', email: 'ada@example.com', initials: 'AL' },
  grace: { id: 2, fullName: 'Grace Hopper', email: 'grace@example.com', initials: 'GH' },
}

const organizations = [
  { id: 10, name: 'Acme Labs', slug: 'acme-labs', role: 'owner' },
  { id: 11, name: 'Other Labs', slug: 'other-labs', role: 'member' },
]

/**
 * An organization as the API returns it, with the role the visitor holds in it.
 */
function organization(slug: string, role: string) {
  const found = organizations.find((entry) => entry.slug === slug) ?? organizations[0]

  return {
    id: found.id,
    name: found.name,
    slug: found.slug,
    logoPath: null,
    defaultLocale: 'en',
    onboardedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    role,
  }
}

/**
 * A membership as the API returns it.
 */
function membership(id: number, role: string, person: (typeof people)[keyof typeof people]) {
  return {
    id,
    userId: person.id,
    role,
    createdAt: NOW,
    user: { ...person, avatarPath: null, emailVerifiedAt: NOW },
  }
}

/**
 * Serves the API with an organization where the visitor is the owner.
 */
function serveApp(role: 'owner' | 'admin' | 'member' = 'owner') {
  server.use(
    http.get(SESSION, () => HttpResponse.json({ user })),
    http.get(ORGANIZATIONS, () => HttpResponse.json({ organizations })),
    http.get(ORGANIZATION, ({ params }) =>
      HttpResponse.json({ organization: organization(String(params.orgSlug), role) })
    ),
    http.get(MEMBERS, () =>
      HttpResponse.json({
        members: [membership(1, role, people.ada), membership(2, 'member', people.grace)],
      })
    )
  )
}

/**
 * Shows where the visitor is, so the tests can follow the redirects.
 */
function Location() {
  const location = useLocation()
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>
}

/**
 * Renders the shell of the app with the dashboard inside it.
 */
function renderShell(page = <DashboardPage />) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <PaletteProvider>
            <MemoryRouter initialEntries={['/app/acme-labs']}>
              <Location />
              <Routes>
                <Route path="/app/:orgSlug" element={<AppLayout />}>
                  <Route index element={page} />
                </Route>
                <Route path="/login" element={<p>Login page</p>} />
                <Route path="/onboarding" element={<p>Onboarding page</p>} />
              </Routes>
            </MemoryRouter>
          </PaletteProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}

/**
 * The navigation of the app, which the breadcrumb of the bar on top does not
 * interfere with.
 */
async function navigation() {
  return within(await screen.findByRole('navigation', { name: 'Main navigation' }))
}

beforeEach(() => {
  localStorage.clear()
  window.innerWidth = 1024
})

describe('The shell of the app', () => {
  it('shows the navigation, the bar on top and the dashboard', async () => {
    serveApp()
    renderShell()

    const nav = await navigation()

    expect(await nav.findByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search… ⌘K' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Account menu: AL Ada Lovelace' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Switch language to Spanish' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle light and dark theme' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('hides the navigation behind a menu button on a narrow screen', async () => {
    window.innerWidth = 375
    serveApp()

    renderShell()

    const menu = await screen.findByRole('button', { name: 'Open navigation' })
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument()

    await userEvent.setup().click(menu)

    const nav = await navigation()

    expect(await nav.findByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('remembers the collapsed navigation', async () => {
    serveApp()
    const visitor = userEvent.setup()

    const { unmount } = renderShell()

    await visitor.click(await screen.findByRole('button', { name: 'Collapse sidebar' }))
    expect(localStorage.getItem('sidebar:collapsed')).toBe('true')

    unmount()
    renderShell()

    expect(await screen.findByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
  })

  it('keeps the billing and the API keys away from a member', async () => {
    serveApp('member')
    renderShell()

    const nav = await navigation()

    expect(await nav.findByRole('link', { name: 'Members' })).toBeInTheDocument()
    expect(nav.queryByRole('link', { name: 'Billing' })).not.toBeInTheDocument()
    expect(nav.queryByRole('link', { name: 'API keys' })).not.toBeInTheDocument()
  })

  it('shows the billing and the API keys to an admin', async () => {
    serveApp('admin')
    renderShell()

    const nav = await navigation()

    expect(await nav.findByRole('link', { name: 'Billing' })).toBeInTheDocument()
    expect(nav.getByRole('link', { name: 'API keys' })).toBeInTheDocument()
  })

  it('remembers the organization on the server and moves to it', async () => {
    let body: unknown

    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.get(ORGANIZATIONS, () => HttpResponse.json({ organizations })),
      http.get(ORGANIZATION, ({ params }) =>
        HttpResponse.json({ organization: organization(String(params.orgSlug), 'owner') })
      ),
      http.get(MEMBERS, () => HttpResponse.json({ members: [] })),
      http.post(REMEMBER, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ user })
      })
    )

    const visitor = userEvent.setup()
    renderShell()

    await visitor.click(
      await screen.findByRole('button', { name: 'Switch organization: Acme Labs' })
    )
    await visitor.click(await screen.findByRole('menuitem', { name: 'Other Labs' }))

    await waitFor(() => {
      expect(body).toEqual({ organizationId: 11 })
    })
    expect(screen.getByTestId('location')).toHaveTextContent('/app/other-labs')
  })

  it('starts the setup of a new organization from the switcher', async () => {
    serveApp()
    const visitor = userEvent.setup()

    renderShell()

    await visitor.click(
      await screen.findByRole('button', { name: 'Switch organization: Acme Labs' })
    )
    await visitor.click(await screen.findByRole('menuitem', { name: 'Create organization' }))

    expect(screen.getByTestId('location')).toHaveTextContent('/onboarding')
  })

  it('opens the command palette with the keyboard and focuses the input', async () => {
    serveApp()
    renderShell()

    await screen.findByRole('button', { name: 'Search… ⌘K' })
    await userEvent.setup().keyboard('{Meta>}k{/Meta}')

    const input = await screen.findByRole('combobox')
    expect(input).toHaveFocus()
  })

  it('groups the records found by the search providers', async () => {
    serveApp()

    server.use(
      http.get(MEMBERS, ({ request }) => {
        const search = new URL(request.url).searchParams.get('search')

        return HttpResponse.json({
          members:
            search === 'grace'
              ? [membership(2, 'member', people.grace)]
              : [membership(1, 'owner', people.ada)],
        })
      })
    )

    const visitor = userEvent.setup()
    renderShell()

    await visitor.click(await screen.findByRole('button', { name: 'Search… ⌘K' }))
    await visitor.type(await screen.findByRole('combobox'), 'grace')

    const palette = within(await screen.findByRole('dialog'))

    expect(await palette.findByText('Grace Hopper')).toBeInTheDocument()
    expect(palette.getByText('Members')).toBeInTheDocument()
    expect(palette.getByText('Navigation')).toBeInTheDocument()
  })

  it('shows the not found page when the organization does not exist', async () => {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.get(ORGANIZATIONS, () => HttpResponse.json({ organizations })),
      http.get(ORGANIZATION, () =>
        HttpResponse.json(
          { code: 'E_ORGANIZATION_NOT_FOUND', message: 'Not found' },
          { status: 404 }
        )
      )
    )

    renderShell()

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('sends a visitor without an organization to the setup', async () => {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.get(ORGANIZATIONS, () => HttpResponse.json({ organizations: [] })),
      http.get(ORGANIZATION, () =>
        HttpResponse.json(
          { code: 'E_ORGANIZATION_NOT_FOUND', message: 'Not found' },
          { status: 404 }
        )
      )
    )

    renderShell()

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/onboarding')
    })
  })

  it('sends the visitor to the login page when the session expires', async () => {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.get(ORGANIZATIONS, () => HttpResponse.json({ organizations })),
      http.get(ORGANIZATION, () =>
        HttpResponse.json({ code: 'E_UNAUTHORIZED', message: 'Unauthorized' }, { status: 401 })
      )
    )

    renderShell()

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/login?redirectTo=%2Fapp%2Facme-labs'
      )
    })
  })

  it('shows a recoverable page when a page fails to render', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    serveApp()

    function Broken(): never {
      throw new Error('The page is broken')
    }

    renderShell(<Broken />)

    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()

    consoleError.mockRestore()
  })
})
