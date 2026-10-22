import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import AppIndexPage from '@/pages/AppIndexPage'
import OnboardingPage from '@/pages/OnboardingPage'
import { server } from '@/test/server'

/**
 * The redirect to the payment provider leaves the application, so it is
 * replaced here to follow the flow without leaving the browser of the test.
 */
const { redirectTo } = vi.hoisted(() => ({ redirectTo: vi.fn() }))

vi.mock('@/lib/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/billing')>()),
  redirectTo,
}))

const SESSION = `${API_BASE_URL}/api/v1/auth/session`
const ONBOARDING = `${API_BASE_URL}/api/v1/onboarding`
const USE_CASE = `${API_BASE_URL}/api/v1/onboarding/use-case`
const INVITES = `${API_BASE_URL}/api/v1/onboarding/invites`
const PLAN = `${API_BASE_URL}/api/v1/onboarding/plan`
const COMPLETE = `${API_BASE_URL}/api/v1/onboarding/complete`
const ORGANIZATIONS = `${API_BASE_URL}/api/v1/orgs`
const CHECKOUT = `${API_BASE_URL}/api/v1/orgs/acme-labs/billing/checkout`

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
  lastOrganizationId: null,
  createdAt: NOW,
  updatedAt: NOW,
  initials: 'AL',
}

const organization = {
  id: 10,
  name: 'Acme Labs',
  slug: 'acme-labs',
  logoPath: null,
  defaultLocale: 'en',
  onboardedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  role: 'owner',
}

/**
 * The state of the setup, as the API returns it.
 */
function state(step: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    step,
    organization: step === 'details' ? null : organization,
    teamSize: null,
    useCase: null,
    plan: null,
    invitations: [],
    ...overrides,
  }
}

/**
 * Serves the state of the setup and the steps that save it.
 */
function serveOnboarding(
  current: () => Record<string, unknown>,
  handlers: Parameters<typeof server.use>
) {
  server.use(
    http.get(SESSION, () => HttpResponse.json({ user })),
    http.get(ONBOARDING, () => HttpResponse.json({ onboarding: current() })),
    ...handlers
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
 * Renders a page inside the providers it needs.
 */
function renderRoutes(routes: ReactNode, path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>
          <Location />
          <Routes>{routes}</Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}

/**
 * Renders the setup of the organization.
 */
function renderOnboarding(path = '/onboarding') {
  return renderRoutes(
    <>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/app" element={<AppIndexPage />} />
      <Route path="/login" element={<p>Login page</p>} />
    </>,
    path
  )
}

describe('The setup of an organization', () => {
  it('resumes at the step the visitor left', async () => {
    serveOnboarding(() => state('use-case'), [])

    renderOnboarding()

    expect(await screen.findByText('How will you use it?')).toBeInTheDocument()
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('saves the use case and moves to the invitations', async () => {
    let body: unknown

    serveOnboarding(
      () => state('use-case'),
      [
        http.post(USE_CASE, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ onboarding: state('invites') })
        }),
      ]
    )

    const visitor = userEvent.setup()
    renderOnboarding()

    await visitor.click(await screen.findByRole('radio', { name: '2–10 people' }))
    await visitor.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Invite your team')).toBeInTheDocument()
    expect(body).toEqual({ teamSize: '2', useCase: 'content' })
  })

  it('skips the invitations without sending anything', async () => {
    let body: unknown

    serveOnboarding(
      () => state('invites'),
      [
        http.post(INVITES, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ onboarding: state('plan') })
        }),
      ]
    )

    const visitor = userEvent.setup()
    renderOnboarding()

    await visitor.click(await screen.findByRole('button', { name: 'Skip for now' }))

    expect(await screen.findByText('Choose a plan')).toBeInTheDocument()
    expect(body).toEqual({ emails: [] })
  })

  it('sends the invitations of the team', async () => {
    let body: unknown

    serveOnboarding(
      () => state('invites'),
      [
        http.post(INVITES, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ onboarding: state('plan') })
        }),
      ]
    )

    const visitor = userEvent.setup()
    renderOnboarding()

    await visitor.type(await screen.findByLabelText('Email address'), 'ana@example.com')
    await visitor.click(screen.getByRole('button', { name: 'Send invitations' }))

    expect(await screen.findByText('Choose a plan')).toBeInTheDocument()
    expect(body).toEqual({ emails: ['ana@example.com'] })
  })

  it('preselects the plan chosen in the pricing page', async () => {
    serveOnboarding(() => state('plan'), [])

    renderOnboarding('/onboarding?plan=pro&interval=year')

    expect(
      await screen.findByText('We preselected Pro for you from the pricing page.')
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Pro/ })).toBeChecked()
    expect(screen.getByText('Yearly')).toBeInTheDocument()
  })

  it('saves the chosen plan', async () => {
    let body: unknown

    serveOnboarding(
      () => state('plan'),
      [
        http.post(PLAN, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ onboarding: state('complete') })
        }),
      ]
    )

    const visitor = userEvent.setup()
    renderOnboarding()

    await visitor.click(await screen.findByRole('button', { name: 'Continue on the free plan' }))

    expect(await screen.findByText('Your workspace is ready')).toBeInTheDocument()
    expect(body).toEqual({ plan: 'free', interval: 'month' })
  })

  it('creates the organization in the first step', async () => {
    let body: unknown
    let created = false

    serveOnboarding(
      () => (created ? state('use-case') : state('details')),
      [
        http.post(ORGANIZATIONS, async ({ request }) => {
          body = await request.json()
          created = true
          return HttpResponse.json({ organization }, { status: 201 })
        }),
        http.get(ORGANIZATIONS, () => HttpResponse.json({ organizations: [organization] })),
      ]
    )

    const visitor = userEvent.setup()
    renderOnboarding()

    await visitor.type(await screen.findByLabelText('Name'), 'Acme Labs')
    await visitor.type(screen.getByLabelText('URL slug'), 'acme-labs')
    await visitor.click(screen.getByRole('button', { name: 'Create organization' }))

    expect(await screen.findByText('How will you use it?')).toBeInTheDocument()
    expect(body).toEqual({ name: 'Acme Labs', slug: 'acme-labs', defaultLocale: 'en' })
  })

  it('lands on the dashboard when the setup is finished', async () => {
    serveOnboarding(
      () => state('complete'),
      [http.post(COMPLETE, () => HttpResponse.json({ onboarding: state('done') }))]
    )

    const visitor = userEvent.setup()
    renderOnboarding()

    await visitor.click(await screen.findByRole('button', { name: 'Finish setup' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/app')
    })
  })

  it('sends the visitor to the payment provider when the plan is paid', async () => {
    let body: unknown

    serveOnboarding(
      () => state('complete', { plan: { key: 'pro', interval: 'year' } }),
      [
        http.post(CHECKOUT, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json({ checkoutUrl: 'https://checkout.test/prod_pro_year' })
        }),
        http.post(COMPLETE, () => HttpResponse.json({ onboarding: state('done') })),
      ]
    )

    const visitor = userEvent.setup()
    renderOnboarding()

    expect(
      await screen.findByText('You will be taken to the payment provider to pay for Pro.')
    ).toBeInTheDocument()

    await visitor.click(screen.getByRole('button', { name: 'Finish setup' }))

    await waitFor(() => {
      expect(redirectTo).toHaveBeenCalledWith('https://checkout.test/prod_pro_year')
    })
    expect(body).toEqual({ plan: 'pro', interval: 'year' })
  })

  it('does not show the setup again when the organization is ready', async () => {
    serveOnboarding(() => state('done'), [])

    renderOnboarding()

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/app')
    })
  })
})

describe('The entry of the app', () => {
  it('sends a visitor without an organization to the setup', async () => {
    serveOnboarding(
      () => state('details'),
      [http.get(ORGANIZATIONS, () => HttpResponse.json({ organizations: [] }))]
    )

    renderOnboarding('/app')

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/onboarding')
    })
  })
})
