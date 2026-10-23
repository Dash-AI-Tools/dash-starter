import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import BillingPage from '@/pages/BillingPage'
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

const BILLING = `${API_BASE_URL}/api/v1/orgs/acme-labs/billing`
const PLANS = `${API_BASE_URL}/api/v1/plans`
const CHECKOUT = `${API_BASE_URL}/api/v1/orgs/acme-labs/billing/checkout`
const CHANGE_PLAN = `${API_BASE_URL}/api/v1/orgs/acme-labs/billing/change-plan`
const CANCEL = `${API_BASE_URL}/api/v1/orgs/acme-labs/billing/cancel`
const PORTAL = `${API_BASE_URL}/api/v1/orgs/acme-labs/billing/portal`
const INVOICES = `${API_BASE_URL}/api/v1/orgs/acme-labs/billing/invoices`

const RENEWAL = '2026-06-15T12:00:00.000Z'

const entitlements = {
  seats: 10,
  aiCredits: 1000,
  mcpEnabled: true,
  mcpCalls: 1000,
  mcpRpm: 30,
}

/**
 * The state of the billing of an organization, as the API returns it.
 */
function billing(overrides: Record<string, unknown> = {}) {
  return {
    plan: {
      key: 'pro',
      name: 'Pro',
      description: 'For teams that need the AI and the API in their day to day.',
      entitlements,
    },
    subscription: {
      status: 'active',
      interval: 'month',
      amountCents: 1900,
      currency: 'USD',
      currentPeriodEnd: RENEWAL,
      cancelAtPeriodEnd: false,
      graceUntil: null,
    },
    usage: { seats: 3, aiCredits: 120, mcpCalls: 40 },
    ...overrides,
  }
}

/**
 * The catalog of plans, as the API returns it.
 */
const plans = [
  {
    key: 'free',
    name: 'Free',
    description: 'Everything you need to try the product with your team.',
    features: ['Up to 3 seats'],
    isDefaultFree: true,
    entitlements: { seats: 3, aiCredits: 100, mcpEnabled: false, mcpCalls: 0, mcpRpm: 0 },
    prices: [
      { id: 1, interval: 'month', amountCents: 0, currency: 'USD' },
      { id: 2, interval: 'year', amountCents: 0, currency: 'USD' },
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'For teams that need the AI and the API in their day to day.',
    features: ['Up to 10 seats'],
    isDefaultFree: false,
    entitlements,
    prices: [
      { id: 3, interval: 'month', amountCents: 1900, currency: 'USD' },
      { id: 4, interval: 'year', amountCents: 19000, currency: 'USD' },
    ],
  },
  {
    key: 'business',
    name: 'Business',
    description: 'For organizations that need more seats and more control.',
    features: ['Up to 50 seats'],
    isDefaultFree: false,
    entitlements: { seats: 50, aiCredits: 5000, mcpEnabled: true, mcpCalls: 10000, mcpRpm: 60 },
    prices: [
      { id: 5, interval: 'month', amountCents: 4900, currency: 'USD' },
      { id: 6, interval: 'year', amountCents: 49000, currency: 'USD' },
    ],
  },
]

/**
 * The invoices of an organization, newest first, as the API returns them.
 */
const invoices = [
  {
    id: 2,
    plan: 'Business',
    amount: 4900,
    currency: 'USD',
    state: 'failed',
    createdAt: '2026-05-15T12:00:00.000Z',
  },
  {
    id: 1,
    plan: 'Pro',
    amount: 2900,
    currency: 'USD',
    state: 'paid',
    createdAt: '2026-04-15T12:00:00.000Z',
  },
]

/**
 * Serves the state of the billing, the catalog of plans and the invoices.
 */
function serveBilling(
  current: () => Record<string, unknown>,
  listed: Record<string, unknown>[] = []
) {
  server.use(
    http.get(BILLING, () => HttpResponse.json({ billing: current() })),
    http.get(PLANS, () => HttpResponse.json({ plans })),
    http.get(INVOICES, () => HttpResponse.json({ invoices: listed }))
  )
}

/**
 * The rows of the table of invoices, below its header.
 */
async function invoiceRows() {
  const table = await screen.findByRole('table')
  return within(table).getAllByRole('row').slice(1)
}

/**
 * Renders the billing of an organization.
 */
function renderBilling(path = '/app/acme-labs/settings/billing') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/app/:orgSlug/settings/billing" element={<BillingPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}

describe('The billing of an organization', () => {
  beforeEach(() => {
    redirectTo.mockClear()
  })

  afterEach(() => {
    document.cookie = 'locale=; path=/; max-age=0'
  })

  it('shows the plan, the status and the next renewal', async () => {
    serveBilling(() => billing())

    renderBilling()

    expect(await screen.findByText('Pro')).toBeInTheDocument()
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getByText('Jun 15, 2026')).toBeInTheDocument()
    expect(screen.getByText('$19.00/month')).toBeInTheDocument()
  })

  it('shows the usage against the limits of the plan', async () => {
    serveBilling(() => billing())

    renderBilling()

    expect(await screen.findByText('3 of 10')).toBeInTheDocument()
    expect(screen.getByText('120 of 1000')).toBeInTheDocument()
    expect(screen.getByText('40 of 1000')).toBeInTheDocument()
  })

  it('warns the admins when the payment failed', async () => {
    serveBilling(() =>
      billing({
        subscription: {
          status: 'past_due',
          interval: 'month',
          amountCents: 1900,
          currency: 'USD',
          currentPeriodEnd: RENEWAL,
          cancelAtPeriodEnd: false,
          graceUntil: '2026-06-20T00:00:00.000Z',
        },
      })
    )

    renderBilling()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Payment failed. Access continues during the 7 day grace period.'
    )
  })

  it('waits for the provider when the visitor comes back from the checkout', async () => {
    serveBilling(() =>
      billing({
        plan: {
          key: 'free',
          name: 'Free',
          description: 'Everything you need to try the product with your team.',
          entitlements: {
            seats: 3,
            aiCredits: 100,
            mcpEnabled: false,
            mcpCalls: 0,
            mcpRpm: 0,
          },
        },
        subscription: null,
      })
    )

    renderBilling('/app/acme-labs/settings/billing?checkout=success')

    expect(await screen.findByText('Processing')).toBeInTheDocument()
    expect(
      screen.getByText(
        'We are waiting for the payment provider to confirm your subscription. This page updates automatically.'
      )
    ).toBeInTheDocument()
  })

  it('starts the checkout of a plan and sends the visitor to the provider', async () => {
    let body: unknown

    serveBilling(() =>
      billing({
        plan: {
          key: 'free',
          name: 'Free',
          description: 'Everything you need to try the product with your team.',
          entitlements: {
            seats: 3,
            aiCredits: 100,
            mcpEnabled: false,
            mcpCalls: 0,
            mcpRpm: 0,
          },
        },
        subscription: null,
      })
    )

    server.use(
      http.post(CHECKOUT, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ checkoutUrl: 'https://checkout.test/prod_business_month' })
      })
    )

    const visitor = userEvent.setup()
    renderBilling()

    await visitor.click(await screen.findByRole('button', { name: 'Change plan' }))
    await visitor.click(await screen.findByRole('button', { name: 'Select Business' }))

    await waitFor(() => {
      expect(redirectTo).toHaveBeenCalledWith('https://checkout.test/prod_business_month')
    })
    expect(body).toEqual({ plan: 'business', interval: 'month' })
  })

  it('moves the subscription to another plan', async () => {
    let body: unknown

    serveBilling(() => billing())

    server.use(
      http.post(CHANGE_PLAN, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ success: true })
      })
    )

    const visitor = userEvent.setup()
    renderBilling()

    await visitor.click(await screen.findByRole('button', { name: 'Change plan' }))
    await visitor.click(await screen.findByRole('button', { name: 'Yearly' }))

    await visitor.click(await screen.findByRole('button', { name: 'Select Business' }))

    await waitFor(() => {
      expect(body).toEqual({ plan: 'business', interval: 'year' })
    })
  })

  it('cancels the subscription when the period ends', async () => {
    let body: unknown

    serveBilling(() => billing())

    server.use(
      http.post(CANCEL, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ success: true })
      })
    )

    const visitor = userEvent.setup()
    renderBilling()

    await visitor.click(await screen.findByRole('button', { name: 'Cancel subscription' }))
    await visitor.click(await screen.findByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(body).toEqual({ mode: 'scheduled' })
    })
  })

  it('opens the customer portal of the organization', async () => {
    serveBilling(() => billing())

    server.use(
      http.get(PORTAL, () => HttpResponse.json({ portalUrl: 'https://portal.test/cus_1' }))
    )

    const visitor = userEvent.setup()
    renderBilling()

    await visitor.click(await screen.findByRole('button', { name: 'Manage payment and invoices' }))

    await waitFor(() => {
      expect(redirectTo).toHaveBeenCalledWith('https://portal.test/cus_1')
    })
  })

  it('lists the invoices in English', async () => {
    serveBilling(() => billing(), invoices)

    renderBilling()

    expect(await screen.findByText('Invoices')).toBeInTheDocument()

    const table = await screen.findByRole('table')
    for (const header of ['Plan', 'Amount', 'State', 'Date']) {
      expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument()
    }

    const [failed, paid] = await invoiceRows()
    expect(within(failed).getByText('Business')).toBeInTheDocument()
    expect(within(failed).getByText('$49.00')).toBeInTheDocument()
    expect(within(failed).getByText('Failed')).toBeInTheDocument()
    expect(within(failed).getByText('May 15, 2026')).toBeInTheDocument()

    expect(within(paid).getByText('Pro')).toBeInTheDocument()
    expect(within(paid).getByText('$29.00')).toBeInTheDocument()
    expect(within(paid).getByText('Paid')).toBeInTheDocument()
    expect(within(paid).getByText('Apr 15, 2026')).toBeInTheDocument()
  })

  it('lists the invoices in Spanish', async () => {
    document.cookie = 'locale=es; path=/'
    serveBilling(() => billing(), invoices)

    renderBilling()

    expect(await screen.findByText('Facturas')).toBeInTheDocument()

    const table = await screen.findByRole('table')
    for (const header of ['Plan', 'Importe', 'Estado', 'Fecha']) {
      expect(within(table).getByRole('columnheader', { name: header })).toBeInTheDocument()
    }

    /**
     * The separators of the Spanish formats depend on the ICU data of the
     * runtime, so the expected text comes from the same Intl call, with its
     * spaces normalized as Testing Library normalizes the text of the page.
     */
    const normalized = (text: string) => text.replace(/\s+/g, ' ')
    const amount = (cents: number) =>
      normalized(
        new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(cents / 100)
      )
    const date = (value: string) =>
      normalized(new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(value)))

    const [failed, paid] = await invoiceRows()
    expect(within(failed).getByText('Business')).toBeInTheDocument()
    expect(within(failed).getByText(amount(4900))).toHaveTextContent(/49,00/)
    expect(within(failed).getByText('Fallida')).toBeInTheDocument()
    expect(within(failed).getByText(date('2026-05-15T12:00:00.000Z'))).toBeInTheDocument()

    expect(within(paid).getByText('Pro')).toBeInTheDocument()
    expect(within(paid).getByText(amount(2900))).toHaveTextContent(/29,00/)
    expect(within(paid).getByText('Pagada')).toBeInTheDocument()
    expect(within(paid).getByText(date('2026-04-15T12:00:00.000Z'))).toBeInTheDocument()
  })

  it('shows the empty state when there is no invoice', async () => {
    serveBilling(() => billing(), [])

    renderBilling()

    expect(await screen.findByText('No invoices yet')).toBeInTheDocument()
    expect(
      screen.getByText('Your invoices appear here once the first period is billed.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
