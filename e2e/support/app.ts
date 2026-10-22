import { expect, type Page } from '@playwright/test'
import { en, type Messages } from '../../apps/web/src/locales/en/index'
import mailEn from '../../apps/api/resources/lang/en/mail.json' with { type: 'json' }
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
export async function signUp(page: Page, email: string, t: Messages = en): Promise<void> {
  await page.goto('/signup')

  await page.getByLabel(t.fullName, { exact: true }).fill('Ada Lovelace')
  await page.getByLabel(t.email, { exact: true }).fill(email)
  await page.getByLabel(t.password, { exact: true }).fill(PASSWORD)
  await page.getByLabel(t.confirmPassword, { exact: true }).fill(PASSWORD)
  await page.getByRole('checkbox', { name: t.acceptTerms, exact: true }).click()

  await page.getByRole('button', { name: t.signUp, exact: true }).click()

  await expect(page).toHaveURL(/\/onboarding/)
}

/**
 * Accepts the cookies, so the banner does not cover the page.
 */
export async function acceptCookies(page: Page, t: Messages = en): Promise<void> {
  const banner = page.getByRole('region', { name: t.bannerTitle })
  const accept = banner.getByRole('button', { name: t.acceptAll, exact: true })

  if (!(await accept.isVisible())) return

  await accept.click()

  await expect(banner).toBeHidden()
}

/**
 * Signs a visitor in with an account of the suite.
 */
export async function signIn(page: Page, email: string, t: Messages = en): Promise<void> {
  await page.goto('/login')

  await page.getByLabel(t.email, { exact: true }).fill(email)
  await page.getByLabel(t.password, { exact: true }).fill(PASSWORD)

  await page.getByRole('button', { name: t.signIn, exact: true }).click()

  await expect(page).not.toHaveURL(/\/login/)
}

/**
 * Opens the link that proves the ownership of the address and walks into the
 * setup of the workspace.
 */
export async function verifyEmail(
  page: Page,
  email: string,
  subject = mailEn.verify_email.subject
): Promise<void> {
  const mail = await waitForMail(email, subject)

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
export async function createOrganization(
  page: Page,
  name: string,
  slug: string,
  t: Messages = en
): Promise<void> {
  await page.getByLabel(t.name, { exact: true }).fill(name)
  await page.getByLabel(t.slug, { exact: true }).fill(slug)

  await page.getByRole('button', { name: t.createSubmit, exact: true }).click()

  /**
   * The second step asks how the organization will use the product.
   */
  await page.getByRole('radio', { name: t.teamSize2 }).check()
  await page.getByRole('radio', { name: t.primaryUseCase2 }).check()
  await page.getByRole('button', { name: t.continue, exact: true }).click()

  /**
   * The third step offers to invite the team. The suite does not need it
   * here: the invitation has a flow of its own.
   */
  await page.getByRole('button', { name: t.invitesSkip, exact: true }).click()

  /**
   * The fourth step chooses the plan. The free plan is enough.
   */
  await page.getByRole('button', { name: t.planFree, exact: true }).click()

  /**
   * The last step closes the setup.
   */
  await page.getByRole('button', { name: t.complete, exact: true }).click()

  await expect(page).toHaveURL(new RegExp(`/app/${slug}$`))
}

/**
 * The identifier of an organization, read from the API with the session of the
 * browser.
 */
export async function organizationId(page: Page, slug: string): Promise<number> {
  const response = await page.request.get(`/api/v1/orgs/${slug}`)

  expect(response.ok()).toBe(true)

  const body = (await response.json()) as { organization: { id: number } }

  return body.organization.id
}
