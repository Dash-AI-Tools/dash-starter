import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConsentProvider } from '@/providers/consent-provider'
import PublicLayout from '@/layouts/PublicLayout'
import { API_BASE_URL } from '@/lib/api'
import { CONSENT_COOKIE, CONSENT_POLICY_VERSION } from '@/lib/consent'
import { I18nProvider } from '@/lib/i18n'
import { PaletteProvider } from '@/providers/palette-provider'
import Home from '@/pages/Home'
import PrivacyPage from '@/pages/PrivacyPage'
import PricingPage from '@/pages/PricingPage'
import TermsPage from '@/pages/TermsPage'
import { server } from '@/test/server'

const SESSION = `${API_BASE_URL}/api/v1/auth/session`
const PLANS = `${API_BASE_URL}/api/v1/plans`

/**
 * The catalog of plans, as the API returns it. The Business plan has no
 * yearly price, so the pricing page has to say that it is not available.
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
    entitlements: { seats: 10, aiCredits: 1000, mcpEnabled: true, mcpCalls: 1000, mcpRpm: 30 },
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
    prices: [{ id: 5, interval: 'month', amountCents: 4900, currency: 'USD' }],
  },
]

/**
 * The current path, so the tests can see where the visitor was sent.
 */
function CurrentPath() {
  const location = useLocation()
  return <span data-testid="path">{location.pathname + location.search}</span>
}

/**
 * Renders the public site with the pages it is made of.
 */
function renderPublic(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ConsentProvider>
          <PaletteProvider>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route index element={<Home />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="privacy" element={<PrivacyPage />} />
                </Route>
              </Routes>
              <CurrentPath />
            </MemoryRouter>
          </PaletteProvider>
        </ConsentProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}

/**
 * The visitor that already decided about the cookies: the banner is not in
 * the way of the pages.
 */
function storeConsent() {
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
    JSON.stringify({
      v: CONSENT_POLICY_VERSION,
      categories: { necessary: true, analytics: false, marketing: false },
      ts: Date.now(),
    })
  )}; path=/`
}

describe('The public site', () => {
  beforeEach(() => {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user: null })),
      http.get(PLANS, () => HttpResponse.json({ plans }))
    )
    storeConsent()
  })

  afterEach(() => {
    document.cookie = 'locale=; path=/; max-age=0'
    document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`
  })

  it('shows the header, the navigation and the legal links of the footer', () => {
    renderPublic('/')

    const header = screen.getByRole('banner')
    expect(within(header).getByRole('link', { name: 'Dash' })).toBeInTheDocument()
    expect(within(header).getByRole('link', { name: 'Pricing' })).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: 'English' })).toBeInTheDocument()
    expect(within(header).getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(within(header).getByRole('link', { name: 'Create account' })).toBeInTheDocument()

    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Pricing' })).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: 'Terms of Service' })).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: 'Privacy Policy' })).toBeInTheDocument()
    expect(within(footer).getByRole('button', { name: 'Cookie preferences' })).toBeInTheDocument()
    expect(within(footer).getByRole('link', { name: 'Contact support' })).toBeInTheDocument()
  })

  it('sends a signed-in visitor to the dashboard instead of the login', async () => {
    server.use(
      http.get(SESSION, () =>
        HttpResponse.json({
          user: {
            id: 'user_1',
            email: 'ada@example.test',
            fullName: 'Ada Lovelace',
            initials: 'AL',
            avatarPath: null,
            locale: 'en',
            theme: 'system',
            termsVersion: '2026-01-01',
          },
        })
      )
    )

    renderPublic('/')

    expect(await screen.findByRole('link', { name: 'Go to dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
  })

  it('opens the preferences of the cookies from the footer', async () => {
    const visitor = userEvent.setup()
    renderPublic('/')

    await visitor.click(screen.getByRole('button', { name: 'Cookie preferences' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Necessary' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })
})

describe('The landing page', () => {
  beforeEach(() => {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user: null })),
      http.get(PLANS, () => HttpResponse.json({ plans }))
    )
    storeConsent()
  })

  afterEach(() => {
    document.cookie = 'locale=; path=/; max-age=0'
    document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`
  })

  it('shows the hero, the command, the stations of the line and the FAQ', () => {
    renderPublic('/')

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Every station of your AI SaaS, already running.',
      })
    ).toBeInTheDocument()
    expect(screen.getByText('npx create-dash-starter')).toBeInTheDocument()

    for (const name of ['Auth', 'Organizations', 'Billing', 'AI', 'MCP', 'Email']) {
      expect(
        screen.getByRole('heading', { level: 2, name: new RegExp(`^${name} `) })
      ).toBeInTheDocument()
    }

    expect(
      screen.getAllByRole('img', { name: 'The billing page of the demo organization' })
    ).toHaveLength(2)
    expect(screen.getByText('End of the line: your product.')).toBeInTheDocument()
    expect(screen.getByText('Frequently asked questions')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Create your account' }).length).toBe(2)
  })

  it('copies the command that creates a project', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()

    renderPublic('/')
    await user.click(screen.getByRole('button', { name: 'Copy command' }))

    expect(writeText).toHaveBeenCalledWith('npx create-dash-starter')
    expect(await screen.findAllByText('Command copied')).not.toHaveLength(0)
  })

  it('shows the landing page in Spanish', () => {
    document.cookie = 'locale=es; path=/'

    renderPublic('/')

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Cada estación de tu SaaS de IA, ya funcionando.',
      })
    ).toBeInTheDocument()
    expect(screen.getByText('Every station of your AI SaaS, already running.')).toHaveAttribute(
      'lang',
      'en'
    )
    expect(screen.getByRole('heading', { level: 2, name: /^Cobros / })).toBeInTheDocument()
  })
})

describe('The pricing page', () => {
  beforeEach(() => {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user: null })),
      http.get(PLANS, () => HttpResponse.json({ plans }))
    )
    storeConsent()
  })

  afterEach(() => {
    document.cookie = 'locale=; path=/; max-age=0'
    document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`
  })

  it('lists the plans of the catalog with their monthly price', async () => {
    renderPublic('/pricing')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Plans and pricing' })
    ).toBeInTheDocument()
    expect(
      await screen.findByText('For teams that need the AI and the API in their day to day.')
    ).toBeInTheDocument()
    expect(screen.getByText('$19.00')).toBeInTheDocument()
    expect(screen.getAllByText('/month').length).toBe(2)
  })

  it('shows the yearly price and the saving against twelve monthly payments', async () => {
    const visitor = userEvent.setup()
    renderPublic('/pricing')

    await visitor.click(await screen.findByRole('button', { name: 'Yearly' }))

    await waitFor(() => {
      expect(screen.getByText('$190.00')).toBeInTheDocument()
    })
    expect(screen.getByText('/year')).toBeInTheDocument()
    expect(screen.getByText('Save 17%')).toBeInTheDocument()
  })

  it('says that a plan without a yearly price is not available', async () => {
    const visitor = userEvent.setup()
    renderPublic('/pricing')

    await visitor.click(await screen.findByRole('button', { name: 'Yearly' }))

    await waitFor(() => {
      expect(screen.getByText('Not available with this billing period')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Choose Business' })).toBeDisabled()
  })

  it('sends an anonymous visitor to the sign-up with the plan they chose', async () => {
    const visitor = userEvent.setup()
    renderPublic('/pricing')

    await visitor.click(await screen.findByRole('button', { name: 'Choose Pro' }))

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/signup?plan=pro&interval=month')
    })
  })

  it('shows the title of the page in Spanish', () => {
    document.cookie = 'locale=es; path=/'

    renderPublic('/pricing')

    expect(document.title).toBe('Planes y precios')
  })

  it('sends a signed-in visitor to the dashboard', async () => {
    server.use(
      http.get(SESSION, () =>
        HttpResponse.json({
          user: {
            id: 'user_1',
            email: 'ada@example.test',
            fullName: 'Ada Lovelace',
            initials: 'AL',
            avatarPath: null,
            locale: 'en',
            theme: 'system',
            termsVersion: '2026-01-01',
          },
        })
      )
    )

    const visitor = userEvent.setup()
    renderPublic('/pricing')

    await visitor.click(await screen.findByRole('button', { name: 'Choose Pro' }))

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/app')
    })
  })
})

describe('The legal pages', () => {
  beforeEach(() => {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user: null })),
      http.get(PLANS, () => HttpResponse.json({ plans }))
    )
    storeConsent()
  })

  afterEach(() => {
    document.cookie = 'locale=; path=/; max-age=0'
    document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`
  })

  it('shows the terms with their version, their date and the notice of the template', () => {
    renderPublic('/terms')

    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeInTheDocument()
    expect(screen.getByText(/Version 2026-01-01/)).toBeInTheDocument()
    expect(screen.getByText(/Last updated: Jan 1, 2026/)).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('This is placeholder legal text')
  })

  it('shows the terms in Spanish', () => {
    document.cookie = 'locale=es; path=/'

    renderPublic('/terms')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Términos del Servicio' })
    ).toBeInTheDocument()
    expect(screen.getByText(/Versión 2026-01-01/)).toBeInTheDocument()
    expect(screen.getByText(/Última actualización: 1 ene 2026/)).toBeInTheDocument()
  })

  it('shows the privacy policy with the table of the cookies', () => {
    renderPublic('/privacy')

    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('This is placeholder legal text')

    const table = screen.getByRole('table')
    expect(within(table).getAllByText('Necessary').length).toBe(5)
    expect(within(table).getByText('Analytics')).toBeInTheDocument()
    expect(within(table).getByText('Marketing')).toBeInTheDocument()
    expect(within(table).getByText('adonis-session')).toBeInTheDocument()
    expect(within(table).getByText('Session cookie that keeps you signed in')).toBeInTheDocument()
  })
})
