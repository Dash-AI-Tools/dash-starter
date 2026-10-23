import { expect, test, type Page } from '@playwright/test'
import { en } from '../../apps/web/src/locales/en/index'
import { createOrganization, signUp, uniqueEmail, uniqueSlug, verifyEmail } from '../support/app'

/**
 * The name `signUp` gives to the accounts of the suite.
 */
const FULL_NAME = 'Ada Lovelace'

/**
 * The card of the dashboard that carries a metric, found by its label.
 */
function metric(page: Page, label: string) {
  return page.locator('[data-slot="card"]').filter({
    has: page.getByText(label, { exact: true }),
  })
}

/**
 * The AI credits of the plan every organization starts with, read from the
 * catalog the pricing page shows.
 */
async function freeCredits(page: Page): Promise<number> {
  const response = await page.request.get('/api/v1/plans')

  expect(response.ok()).toBe(true)

  const body = (await response.json()) as {
    plans: { isDefaultFree: boolean; entitlements: { aiCredits: number } }[]
  }
  const free = body.plans.find((plan) => plan.isDefaultFree)

  expect(free).toBeDefined()

  return free!.entitlements.aiCredits
}

test.describe('The dashboard of the organization', () => {
  test('shows the real metrics and the activity of a new owner', async ({ page }) => {
    const email = uniqueEmail('dashboard')
    const slug = uniqueSlug('acme')

    await signUp(page, email)
    await verifyEmail(page, email)
    await createOrganization(page, 'Acme Labs', slug)

    await expect(page.getByRole('heading', { name: en.dashboardTitle })).toBeVisible()

    /**
     * The owner is the only member of the new organization.
     */
    await expect(metric(page, en.kpiMembers).getByText('1', { exact: true })).toBeVisible()

    /**
     * A new organization has not spent any credit yet, so every credit of the
     * free plan is left.
     */
    const credits = new Intl.NumberFormat('en').format(await freeCredits(page))

    await expect(metric(page, en.kpiAiCredits).getByText(credits, { exact: true })).toBeVisible()

    /**
     * The activity shows the owner joining the organization, by name.
     */
    const joined = page.getByRole('row').filter({ hasText: en.activityMemberJoined })

    await expect(joined).toHaveCount(1)
    await expect(joined).toContainText(FULL_NAME)
  })
})
