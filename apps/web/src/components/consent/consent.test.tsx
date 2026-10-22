import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ConsentProvider, useConsent } from '@/providers/consent-provider'
import {
  CONSENT_COOKIE,
  CONSENT_POLICY_VERSION,
  OPEN_COOKIE_PREFERENCES,
  readConsent,
  registerScript,
} from '@/lib/consent'
import { I18nProvider } from '@/lib/i18n'
import { server } from '@/test/server'

const ANALYTICS_SCRIPT = 'https://analytics.test/measure.js'

/**
 * The state of the consent, so the tests can see what the visitor allowed.
 */
function Probe() {
  const { choices, isAllowed } = useConsent()

  return (
    <div>
      <span data-testid="choices">{JSON.stringify(choices)}</span>
      <span data-testid="analytics">{String(isAllowed('analytics'))}</span>
    </div>
  )
}

/**
 * Renders the consent module with a page that reads it.
 */
function renderConsent() {
  return render(
    <I18nProvider>
      <ConsentProvider>
        <Probe />
      </ConsentProvider>
    </I18nProvider>
  )
}

/**
 * Writes a consent in the cookie of the browser, as an older version of the
 * policy or as a choice made long ago would be.
 */
function storeRaw(consent: { v: string; categories: unknown; ts: number }) {
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
    JSON.stringify(consent)
  )}; path=/`
}

describe('The consent of the cookies', () => {
  beforeEach(() => {
    registerScript('analytics', 'analytics', ANALYTICS_SCRIPT)
    server.use(http.get('https://analytics.test/*', () => HttpResponse.text('')))
  })

  afterEach(() => {
    document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`
  })

  it('asks for the consent on the first visit, with the three actions', () => {
    renderConsent()

    const banner = screen.getByRole('region', { name: 'We use cookies' })
    expect(banner).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept all' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject non-essential' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Customize' })).toBeInTheDocument()
  })

  it('does not ask again when the choice is already made', () => {
    storeRaw({
      v: CONSENT_POLICY_VERSION,
      categories: { necessary: true, analytics: false, marketing: false },
      ts: Date.now(),
    })

    renderConsent()

    expect(screen.queryByRole('region', { name: 'We use cookies' })).not.toBeInTheDocument()
    expect(screen.getByTestId('choices')).toHaveTextContent('"analytics":false')
  })

  it('asks again when the policy version changes', () => {
    storeRaw({
      v: '2025-01-01',
      categories: { necessary: true, analytics: true, marketing: true },
      ts: Date.now(),
    })

    renderConsent()

    expect(screen.getByRole('region', { name: 'We use cookies' })).toBeInTheDocument()
  })

  it('asks again when the choice is older than twelve months', () => {
    const thirteenMonths = 13 * 30 * 24 * 60 * 60 * 1000

    storeRaw({
      v: CONSENT_POLICY_VERSION,
      categories: { necessary: true, analytics: true, marketing: true },
      ts: Date.now() - thirteenMonths,
    })

    renderConsent()

    expect(screen.getByRole('region', { name: 'We use cookies' })).toBeInTheDocument()
  })

  it('rejects the non-essential cookies and remembers the choice', async () => {
    const visitor = userEvent.setup()
    renderConsent()

    await visitor.click(screen.getByRole('button', { name: 'Reject non-essential' }))

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'We use cookies' })).not.toBeInTheDocument()
    })

    expect(readConsent()?.categories).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
    })
  })

  it('accepts every category', async () => {
    const visitor = userEvent.setup()
    renderConsent()

    await visitor.click(screen.getByRole('button', { name: 'Accept all' }))

    await waitFor(() => {
      expect(screen.getByTestId('analytics')).toHaveTextContent('true')
    })
    expect(readConsent()?.categories).toEqual({
      necessary: true,
      analytics: true,
      marketing: true,
    })
  })

  it('stores only the category the visitor grants in the preferences', async () => {
    const visitor = userEvent.setup()
    renderConsent()

    await visitor.click(screen.getByRole('button', { name: 'Customize' }))

    const dialog = await screen.findByRole('dialog')
    await visitor.click(screen.getByRole('switch', { name: 'Analytics' }))
    await visitor.click(within(dialog).getByRole('button', { name: 'Save preferences' }))

    await waitFor(() => {
      expect(screen.getByTestId('analytics')).toHaveTextContent('true')
    })
    expect(readConsent()?.categories).toEqual({
      necessary: true,
      analytics: true,
      marketing: false,
    })
  })

  it('opens the preferences when the application asks for them', async () => {
    renderConsent()

    await act(async () => {
      window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFERENCES))
    })

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Necessary' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  it('loads a script only when its category is granted', async () => {
    /**
     * React only takes a script to the document the first time it sees it,
     * so this one has an address of its own.
     */
    const src = 'https://analytics.test/gated.js'
    registerScript('gated', 'analytics', src)

    const visitor = userEvent.setup()
    renderConsent()

    expect(document.querySelector(`script[src="${src}"]`)).toBeNull()

    await visitor.click(screen.getByRole('button', { name: 'Accept all' }))

    await waitFor(() => {
      expect(document.querySelector(`script[src="${src}"]`)).not.toBeNull()
    })
  })
})
