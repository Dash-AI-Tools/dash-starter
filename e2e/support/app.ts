import { expect, type Page } from '@playwright/test'
import { en } from '../../apps/web/src/locales/en/index'
import { linkOf, waitForMail } from './mailpit'

/**
 * The password of the accounts of the suite.
 */
export const PASSWORD = 'supersecret'

/**
 * An address that no other flow of the suite uses, so the flows never fight
 * for the same account.
 */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
}

/**
 * A slug that no other flow of the suite uses.
 */
export function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Creates an account and leaves the visitor in the setup of the workspace.
 */
export async function signUp(page: Page, email: string): Promise<void> {
  await page.goto('/signup')

  await page.getByLabel(en.fullName, { exact: true }).fill('Ada Lovelace')
  await page.getByLabel(en.email, { exact: true }).fill(email)
  await page.getByLabel(en.password, { exact: true }).fill(PASSWORD)
  await page.getByLabel(en.confirmPassword, { exact: true }).fill(PASSWORD)
  await page.getByRole('checkbox', { name: en.acceptTerms, exact: true }).click()

  await page.getByRole('button', { name: en.signUp, exact: true }).click()

  await expect(page).toHaveURL(/\/onboarding/)
}

/**
 * Accepts the cookies, so the banner does not cover the page.
 */
export async function acceptCookies(page: Page): Promise<void> {
  const banner = page.getByRole('region', { name: en.bannerTitle })
  const accept = banner.getByRole('button', { name: en.acceptAll, exact: true })

  if (!(await accept.isVisible())) return

  await accept.click()

  await expect(banner).toBeHidden()
}

/**
 * Signs a visitor in with an account of the suite.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login')

  await page.getByLabel(en.email, { exact: true }).fill(email)
  await page.getByLabel(en.password, { exact: true }).fill(PASSWORD)

  await page.getByRole('button', { name: en.signIn, exact: true }).click()

  await expect(page).not.toHaveURL(/\/login/)
}

/**
 * Opens the link that proves the ownership of the address and walks into the
 * setup of the workspace.
 */
export async function verifyEmail(page: Page, email: string): Promise<void> {
  const mail = await waitForMail(email, 'Verify your email address')

  await page.goto(linkOf(mail))

  await expect(page).toHaveURL(/\/verify-email\?status=success/)

  /**
   * The link opens in the same tab, so the setup of the workspace is one
   * click away.
   */
  await page.goto('/onboarding')
}

/**
 * Walks through the setup of the workspace and leaves the visitor in the
 * dashboard of the organization.
 */
export async function createOrganization(page: Page, name: string, slug: string): Promise<void> {
  await page.getByLabel(en.name, { exact: true }).fill(name)
  await page.getByLabel(en.slug, { exact: true }).fill(slug)

  await page.getByRole('button', { name: en.createSubmit, exact: true }).click()

  /**
   * The second step asks how the organization will use the product.
   */
  await page.getByRole('radio', { name: en.teamSize2 }).check()
  await page.getByRole('radio', { name: en.primaryUseCase2 }).check()
  await page.getByRole('button', { name: en.continue, exact: true }).click()

  /**
   * The third step offers to invite the team. The suite does not need it
   * here: the invitation has a flow of its own.
   */
  await page.getByRole('button', { name: en.invitesSkip, exact: true }).click()

  /**
   * The fourth step chooses the plan. The free plan is enough.
   */
  await page.getByRole('button', { name: en.planFree, exact: true }).click()

  /**
   * The last step closes the setup.
   */
  await page.getByRole('button', { name: en.complete, exact: true }).click()

  await expect(page).toHaveURL(new RegExp(`/app/${slug}$`))
}

/**
 * The identifier of an organization, read from the API with the session of
 * the browser.
 */
export async function organizationId(page: Page, slug: string): Promise<number> {
  const response = await page.request.get(`/api/v1/orgs/${slug}`)

  expect(response.ok()).toBe(true)

  const body = (await response.json()) as { organization: { id: number } }

  return body.organization.id
}
