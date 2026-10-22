/// <reference lib="dom" />
/**
 * Captures the screens the landing page shows as proof of each station.
 *
 * The landing page never describes a capability without the running screen
 * behind it, so the captures come from the demo stack itself: one per station,
 * locale and theme. Run it against the local stack after the seed:
 *
 *   docker compose up -d && docker compose exec api node ace db:seed
 *   node e2e/scripts/capture-proofs.ts
 *
 * The demo organization borrows the Pro plan, an API key and a conversation
 * while the captures run; all three are removed at the end.
 */
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import mailEn from '../../apps/api/resources/lang/en/mail.json' with { type: 'json' }
import mailEs from '../../apps/api/resources/lang/es/mail.json' with { type: 'json' }

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025'
const OUT_DIR = new URL('../../apps/web/public/proofs/', import.meta.url)

const DEMO_EMAIL = 'demo@example.test'
const DEMO_PASSWORD = 'supersecret'
const DEMO_SLUG = 'demo-organization'
const ORG = `/app/${DEMO_SLUG}`

const LOCALES = ['en', 'es'] as const
const THEMES = ['light', 'dark'] as const

type Locale = (typeof LOCALES)[number]
type Theme = (typeof THEMES)[number]
type Session = Awaited<ReturnType<BrowserContext['storageState']>>

/**
 * The screen behind each station of the line that needs a session.
 */
const STATIONS: Record<string, string> = {
  orgs: `${ORG}/members`,
  billing: `${ORG}/settings/billing`,
  ai: `${ORG}/chat`,
  mcp: `${ORG}/settings/api-keys`,
}

/**
 * The window of the dashboard: narrow enough that its main pane fills the
 * desktop crop, at twice the density so the captures stay legible.
 */
const VIEWPORT = { width: 900, height: 600 }

/**
 * The crops the landing page shows: one for wide screens and a tighter one
 * for phones, both in CSS pixels.
 */
const CROPS = {
  '': { width: 640, height: 480 },
  '-sm': { width: 360, height: 420 },
} as const

/**
 * The question the demo conversation starts with.
 */
const CHAT_PROMPT = 'Summarize the members of my organization by role'

/**
 * Marks what the captures add to the demo, so the cleanup removes only that.
 */
const PROOF_SUBSCRIPTION = 'sub_capture_proofs'
const PROOF_KEY_NAME = 'Claude Desktop'

/**
 * The subject of the password reset email in each locale.
 */
const RESET_SUBJECT: Record<Locale, string> = {
  en: mailEn.reset_password.subject,
  es: mailEs.reset_password.subject,
}

/**
 * Runs SQL against the database of the local Compose stack.
 */
function sql(statement: string): string {
  return execFileSync(
    'docker',
    ['compose', 'exec', '-T', 'db', 'psql', '-U', 'dash', '-d', 'dash', '-tAc', statement],
    { encoding: 'utf8' }
  ).trim()
}

/**
 * Lends the demo organization the Pro plan, so the MCP station shows its keys
 * instead of the upgrade prompt.
 */
function borrowProPlan() {
  sql(`
    INSERT INTO subscriptions (organization_id, plan_price_id, creem_subscription_id, status, current_period_end, cancel_at_period_end, created_at, updated_at)
    SELECT o.id, pp.id, '${PROOF_SUBSCRIPTION}', 'active', now() + interval '30 days', false, now(), now()
    FROM organizations o, plan_prices pp JOIN plans p ON p.id = pp.plan_id
    WHERE o.slug = '${DEMO_SLUG}' AND p.key = 'pro' AND pp.interval = 'month' AND pp.is_active
    ON CONFLICT (organization_id) DO NOTHING`)
}

/**
 * Leaves the demo organization as the captures found it.
 */
function returnProPlan() {
  sql(`DELETE FROM subscriptions WHERE creem_subscription_id = '${PROOF_SUBSCRIPTION}'`)
  sql(`DELETE FROM api_keys WHERE name = '${PROOF_KEY_NAME}'`)
  sql(`DELETE FROM conversations WHERE title = '${CHAT_PROMPT}'`)
}

/**
 * A consent that only allows the necessary cookies, so the banner stays away.
 */
function consentCookie() {
  const value = JSON.stringify({
    v: '2026-01-01',
    categories: { necessary: true, analytics: false, marketing: false },
    ts: Date.now(),
  })

  return { name: 'dash_consent', value: encodeURIComponent(value), url: BASE_URL }
}

async function newContext(browser: Browser, locale: Locale, theme: Theme, session?: Session) {
  const context = await browser.newContext({
    storageState: session,
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: theme,
    locale: locale === 'es' ? 'es-ES' : 'en-US',
  })

  await context.addCookies([consentCookie(), { name: 'locale', value: locale, url: BASE_URL }])
  await context.addInitScript((value) => localStorage.setItem('theme', value), theme)

  return context
}

/**
 * Sends a request with the session and the CSRF token of the page.
 */
async function apiFetch(page: Page, method: string, path: string, body: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const token = decodeURIComponent(
        document.cookie
          .split('; ')
          .find((entry: string) => entry.startsWith('XSRF-TOKEN='))
          ?.split('=')[1] ?? ''
      )

      const response = await fetch(path, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token },
        body: JSON.stringify(body),
      })

      return response.status
    },
    { method, path, body }
  )
}

/**
 * Signs in once and returns the session, so the captures do not trip the
 * rate limit of the sign-in.
 */
async function signIn(browser: Browser): Promise<Session> {
  const context = await newContext(browser, 'en', 'light')
  const page = await context.newPage()

  await page.goto(`${BASE_URL}/login`)
  await page.locator('input[type="email"]').fill(DEMO_EMAIL)
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD)
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))

  const session = await context.storageState()
  await context.close()

  return session
}

/**
 * Gives the demo organization the content its stations show: the Pro plan,
 * an API key and a conversation with the assistant.
 */
async function prepareDemo(browser: Browser, session: Session) {
  borrowProPlan()

  const context = await newContext(browser, 'en', 'light', session)
  const page = await context.newPage()

  await page.goto(`${BASE_URL}${ORG}/chat`)
  await apiFetch(page, 'POST', `/api/v1/orgs/${DEMO_SLUG}/api-keys`, {
    name: PROOF_KEY_NAME,
    scopes: ['mcp:read'],
  })

  const input = page.getByRole('textbox').last()
  await input.fill(CHAT_PROMPT)
  await input.press('Enter')
  await page.waitForTimeout(3000)

  await context.close()
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
}

function proofPath(station: string, locale: Locale, theme: Theme, suffix: string) {
  return new URL(`${station}-${locale}-${theme}${suffix}.jpg`, OUT_DIR).pathname
}

/**
 * Captures a page that lays itself out for any window, such as the sign-in
 * or an email: the window takes the size of each crop.
 */
async function shootWindow(page: Page, station: string, locale: Locale, theme: Theme) {
  for (const [suffix, crop] of Object.entries(CROPS)) {
    await page.setViewportSize(crop)
    await settle(page)
    await page.screenshot({
      path: proofPath(station, locale, theme, suffix),
      type: 'jpeg',
      quality: 78,
    })
  }

  await page.setViewportSize(VIEWPORT)
}

/**
 * Captures the top of the main pane of the dashboard, where each page puts
 * what it is about.
 */
async function shootMain(page: Page, station: string, locale: Locale, theme: Theme) {
  await settle(page)
  const box = await page.locator('main').boundingBox()
  if (!box) throw new Error(`The ${station} page has no main pane`)

  for (const [suffix, crop] of Object.entries(CROPS)) {
    await page.screenshot({
      path: proofPath(station, locale, theme, suffix),
      type: 'jpeg',
      quality: 78,
      clip: { x: box.x, y: box.y, ...crop },
    })
  }
}

/**
 * The newest password reset email Mailpit holds for the demo account in the
 * given locale, rendered as the recipient sees it.
 */
async function latestMailUrl(locale: Locale): Promise<string> {
  const query = `to:${DEMO_EMAIL} subject:"${RESET_SUBJECT[locale]}"`
  const response = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(query)}&limit=1`
  )
  const { messages } = (await response.json()) as { messages: { ID: string }[] }
  if (!messages.length) throw new Error(`No ${locale} reset email for the demo account in Mailpit`)

  return `${MAILPIT_URL}/view/${messages[0].ID}.html`
}

async function captureLocale(browser: Browser, session: Session, locale: Locale) {
  for (const theme of THEMES) {
    /**
     * The login screen, as an anonymous visitor meets it.
     */
    const anonymous = await newContext(browser, locale, theme)
    const loginPage = await anonymous.newPage()
    await loginPage.goto(`${BASE_URL}/login`)
    await shootWindow(loginPage, 'auth', locale, theme)
    await anonymous.close()

    const context = await newContext(browser, locale, theme, session)
    const page = await context.newPage()
    await page.goto(`${BASE_URL}${ORG}`)

    /**
     * The preference of the account wins over the cookie, so the account
     * is switched to the locale and theme of the capture.
     */
    const status = await apiFetch(page, 'PATCH', '/api/v1/account/profile', { locale, theme })
    if (status >= 400) throw new Error(`Could not update the preferences: ${status}`)

    for (const [station, path] of Object.entries(STATIONS)) {
      await page.goto(`${BASE_URL}${path}`)

      /**
       * The assistant is shown in the middle of a conversation, not empty.
       */
      if (station === 'ai') {
        await page.locator('ul li button').first().click()
        await page.waitForTimeout(600)
      }

      await shootMain(page, station, locale, theme)
    }

    /**
     * The email station shows a real transactional email, delivered to
     * Mailpit in the locale of the account. The reset is rate limited per
     * address, so one is asked for per locale.
     */
    if (theme === 'light') {
      await apiFetch(page, 'POST', '/api/v1/auth/forgot-password', { email: DEMO_EMAIL })
      await page.waitForTimeout(1500)
    }

    const mail = await context.newPage()
    await mail.goto(await latestMailUrl(locale))
    await shootWindow(mail, 'email', locale, theme)

    await context.close()
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  const session = await signIn(browser)

  try {
    await prepareDemo(browser, session)

    for (const locale of LOCALES) {
      await captureLocale(browser, session, locale)
    }
  } finally {
    returnProPlan()

    /**
     * The demo account goes back to its seeded preferences.
     */
    const context = await newContext(browser, 'en', 'light', session)
    const page = await context.newPage()
    await page.goto(`${BASE_URL}${ORG}`)
    await apiFetch(page, 'PATCH', '/api/v1/account/profile', { locale: 'en', theme: 'system' })
    await browser.close()
  }
}

await main()
