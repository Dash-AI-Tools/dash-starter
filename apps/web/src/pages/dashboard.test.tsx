import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import DashboardPage from '@/pages/DashboardPage'
import { server } from '@/test/server'

const SESSION = `${API_BASE_URL}/api/v1/auth/session`
const ORGANIZATION = `${API_BASE_URL}/api/v1/orgs/:orgSlug`
const MEMBERS = `${API_BASE_URL}/api/v1/orgs/:orgSlug/members`

const NOW = '2026-01-01T00:00:00.000Z'

const user = {
  id: 1,
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: NOW,
  locale: 'en',
  theme: 'system',
  avatarPath: null,
  pendingEmail: null,
  termsVersion: '2026-01-01',
  lastOrganizationId: 10,
  createdAt: NOW,
  updatedAt: NOW,
  initials: 'AL',
}

/**
 * Serves the organization of the visitor with the given members.
 */
function serveDashboard(members: number) {
  server.use(
    http.get(SESSION, () => HttpResponse.json({ user })),
    http.get(ORGANIZATION, () =>
      HttpResponse.json({
        organization: {
          id: 10,
          name: 'Acme Labs',
          slug: 'acme-labs',
          logoPath: null,
          defaultLocale: 'en',
          onboardedAt: null,
          createdAt: NOW,
          updatedAt: NOW,
          role: 'owner',
        },
      })
    ),
    http.get(MEMBERS, () =>
      HttpResponse.json({
        members: Array.from({ length: members }, (_, index) => ({
          id: index + 1,
          userId: index + 1,
          role: 'member',
          createdAt: NOW,
          user: {
            id: index + 1,
            fullName: `Member ${index + 1}`,
            email: `member${index + 1}@example.com`,
            initials: `M${index + 1}`,
            avatarPath: null,
            emailVerifiedAt: NOW,
          },
        })),
      })
    )
  )
}

/**
 * Renders the dashboard of an organization.
 */
function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={['/app/acme-labs']}>
          <Routes>
            <Route path="/app/:orgSlug" element={<DashboardPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}

describe('DashboardPage', () => {
  it('shows the numbers of the workspace, the usage and the latest activity', async () => {
    serveDashboard(1)
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('AI credits left')).toBeInTheDocument()
    expect(screen.getByText('1,240')).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Usage' })).toBeInTheDocument()

    expect(screen.getByRole('columnheader', { name: 'Who' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'What' })).toBeInTheDocument()
    expect(screen.getByText('joined the organization')).toBeInTheDocument()
  })

  it('ticks the steps of the setup that are already done', async () => {
    serveDashboard(2)
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Invite your teammates' })).toBeChecked()
    })
    expect(screen.getByRole('checkbox', { name: 'Complete your profile' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Try the AI assistant' })).not.toBeChecked()
  })
})
