import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, delay, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChartDatum } from '@/components/patterns/charts'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import DashboardPage from '@/pages/DashboardPage'
import type { Dashboard } from '@/lib/dashboard'
import { server } from '@/test/server'

/**
 * jsdom has no layout, so the chart of the page never draws its points. The
 * chart is replaced by the list of the points it receives, so the tests can
 * read the days and the credits the page gives it.
 */
vi.mock('@/components/patterns/charts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/patterns/charts')>()),
  AreaChartCard: ({ data, seriesName }: { data: ChartDatum[]; seriesName?: string }) => (
    <figure aria-label={seriesName}>
      <ul>
        {data.map((point) => (
          <li key={point.label}>{`${point.label}: ${point.value}`}</li>
        ))}
      </ul>
    </figure>
  ),
}))

const SESSION = `${API_BASE_URL}/api/v1/auth/session`
const ORGANIZATION = `${API_BASE_URL}/api/v1/orgs/:orgSlug`
const MEMBERS = `${API_BASE_URL}/api/v1/orgs/:orgSlug/members`
const CONVERSATIONS = `${API_BASE_URL}/api/v1/orgs/:orgSlug/chat/conversations`
const BILLING = `${API_BASE_URL}/api/v1/orgs/:orgSlug/billing`
const DASHBOARD = `${API_BASE_URL}/api/v1/orgs/:orgSlug/dashboard`

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

/**
 * The metrics the API serves for the organization: a week of usage from
 * Monday 5 to Sunday 11 of January 2026, and three entries of activity, the
 * oldest one by a user that no longer exists.
 */
const METRICS: Dashboard = {
  members: 3,
  seats: { used: 4, limit: 5 },
  aiCredits: { used: 120, limit: 1000 },
  mcpCalls: { used: 20, limit: 500, enabled: true },
  usage: [
    { date: '2026-01-05', credits: 0 },
    { date: '2026-01-06', credits: 10 },
    { date: '2026-01-07', credits: 0 },
    { date: '2026-01-08', credits: 30 },
    { date: '2026-01-09', credits: 0 },
    { date: '2026-01-10', credits: 0 },
    { date: '2026-01-11', credits: 80 },
  ],
  activity: [
    {
      type: 'api_key_created',
      actor: { fullName: 'Ada Lovelace', initials: 'AL' },
      at: '2026-01-11T16:40:00.000Z',
    },
    {
      type: 'invitation_sent',
      actor: { fullName: 'Grace Hopper', initials: 'GH' },
      at: '2026-01-09T11:05:00.000Z',
    },
    { type: 'member_joined', actor: null, at: '2026-01-08T09:12:00.000Z' },
  ],
}

/**
 * Serves the organization of the visitor with the given members, and the
 * metrics of its dashboard.
 */
function serveDashboard(
  members: number,
  options: { conversations?: number; plan?: string; metrics?: Partial<Dashboard> } = {}
) {
  server.use(
    http.get(DASHBOARD, () => HttpResponse.json({ dashboard: { ...METRICS, ...options.metrics } })),
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
    ),
    http.get(CONVERSATIONS, () =>
      HttpResponse.json({
        conversations: Array.from({ length: options.conversations ?? 0 }, (_, index) => ({
          id: index + 1,
          title: `Conversation ${index + 1}`,
          createdAt: NOW,
          updatedAt: NOW,
        })),
      })
    ),
    http.get(BILLING, () =>
      HttpResponse.json({
        billing: {
          plan: {
            key: options.plan ?? 'free',
            name: 'Free',
            description: 'The free plan.',
            entitlements: {
              seats: 3,
              aiCredits: 100,
              mcpEnabled: false,
              mcpCalls: 0,
              mcpRpm: 0,
            },
          },
          subscription: null,
          usage: { seats: 1, aiCredits: 0, mcpCalls: 0 },
        },
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

/**
 * The value shown by the card with the given label.
 */
function cardValue(label: string) {
  const card = screen.getByText(label).closest<HTMLElement>('[data-slot="card"]')
  if (!card) throw new Error(`No card is labelled ${label}`)
  return within(card).getByText((_, element) => element?.getAttribute('data-slot') === 'card-title')
}

describe('DashboardPage', () => {
  afterEach(() => {
    document.cookie = 'locale=; path=/; max-age=0'
  })

  it('shows the members, AI credits left, MCP calls left and seats the API serves', async () => {
    serveDashboard(1)
    renderDashboard()

    await waitFor(() => expect(cardValue('Members')).toHaveTextContent('3'))
    expect(cardValue('AI credits left')).toHaveTextContent('880')
    expect(cardValue('MCP calls left')).toHaveTextContent('480')
    expect(cardValue('Seats used')).toHaveTextContent('4 of 5')
  })

  it('shows a dash in every card while the metrics load', async () => {
    serveDashboard(1)
    server.use(
      http.get(DASHBOARD, async () => {
        await delay('infinite')
      })
    )
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    for (const label of ['Members', 'AI credits left', 'MCP calls left', 'Seats used']) {
      expect(cardValue(label)).toHaveTextContent('—')
    }
  })

  it('shows "Unlimited" when the plan has no limit of AI credits, MCP calls or seats', async () => {
    serveDashboard(1, {
      metrics: {
        seats: { used: 4, limit: -1 },
        aiCredits: { used: 120, limit: -1 },
        mcpCalls: { used: 20, limit: -1, enabled: true },
      },
    })
    renderDashboard()

    await waitFor(() => expect(cardValue('AI credits left')).toHaveTextContent('Unlimited'))
    expect(cardValue('MCP calls left')).toHaveTextContent('Unlimited')
    expect(cardValue('Seats used')).toHaveTextContent('4 of Unlimited')
  })

  it('never shows fewer than 0 AI credits left when the usage passes the limit', async () => {
    serveDashboard(1, { metrics: { aiCredits: { used: 150, limit: 100 } } })
    renderDashboard()

    await waitFor(() => expect(cardValue('AI credits left')).toHaveTextContent(/^0$/))
  })

  it('shows "Not in your plan" for the MCP calls when the plan does not include MCP', async () => {
    serveDashboard(1, { metrics: { mcpCalls: { used: 0, limit: 0, enabled: false } } })
    renderDashboard()

    await waitFor(() => expect(cardValue('MCP calls left')).toHaveTextContent('Not in your plan'))
  })

  it('draws the chart with one point per day of the last 7 days, labelled by weekday', async () => {
    serveDashboard(1)
    renderDashboard()

    const chart = await screen.findByRole('figure', { name: 'Usage' })

    await waitFor(() => expect(within(chart).getAllByRole('listitem')).toHaveLength(7))
    expect(
      within(chart)
        .getAllByRole('listitem')
        .map((point) => point.textContent)
    ).toEqual(['Mon: 0', 'Tue: 10', 'Wed: 0', 'Thu: 30', 'Fri: 0', 'Sat: 0', 'Sun: 80'])
  })

  it('describes each activity with its localized sentence, its actor and its date', async () => {
    serveDashboard(1)
    renderDashboard()

    await screen.findByText('Ada Lovelace')

    const rows = screen.getAllByRole('row')
    const [, apiKey, invitation, joined] = rows

    expect(rows).toHaveLength(4)
    expect(apiKey).toHaveTextContent('Ada Lovelace')
    expect(apiKey).toHaveTextContent('created an API key')
    expect(apiKey).toHaveTextContent('Jan 11, 2026')
    expect(invitation).toHaveTextContent('Grace Hopper')
    expect(invitation).toHaveTextContent('sent an invitation')
    expect(joined).toHaveTextContent('A former member')
    expect(joined).toHaveTextContent('joined the organization')
  })

  it('shows the empty state when the organization has no activity', async () => {
    serveDashboard(1, { metrics: { activity: [] } })
    renderDashboard()

    expect(
      await screen.findByText('No activity yet. It will show up here as your team works.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders the cards, the chart and the activity in Spanish', async () => {
    document.cookie = 'locale=es; path=/'
    serveDashboard(1, { metrics: { aiCredits: { used: 0, limit: -1 } } })
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Panel' })).toBeInTheDocument()
    await waitFor(() =>
      expect(cardValue('Créditos de IA restantes')).toHaveTextContent('Ilimitado')
    )
    expect(cardValue('Puestos usados')).toHaveTextContent('4 de 5')

    const chart = screen.getByRole('figure', { name: 'Uso' })
    expect(
      within(chart)
        .getAllByRole('listitem')
        .map((point) => point.textContent?.split(':')[0])
    ).toEqual(['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'])

    expect(screen.getByText('creó una clave API')).toBeInTheDocument()
    expect(screen.getByText('envió una invitación')).toBeInTheDocument()
    expect(screen.getByText('se unió a la organización')).toBeInTheDocument()
    expect(screen.getByText('Un antiguo miembro')).toBeInTheDocument()
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

  it('ticks the chat and the plan when the organization already uses them', async () => {
    serveDashboard(2, { conversations: 1, plan: 'pro' })
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Try the AI assistant' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'Pick a plan that fits' })).toBeChecked()
    })
  })

  it('leaves the plan of the checklist open when the organization is on the free plan', async () => {
    serveDashboard(2)
    renderDashboard()

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Invite your teammates' })).toBeChecked()
    })

    const plan = screen.getByRole('checkbox', { name: 'Pick a plan that fits' })

    expect(plan).not.toBeChecked()
    expect(screen.getByRole('link', { name: 'Pick a plan that fits' })).toHaveAttribute(
      'href',
      '/app/acme-labs/settings/billing'
    )
  })
})
