import { expect, test } from '@playwright/test'
import errors from '../../apps/api/resources/lang/en/errors.json' with { type: 'json' }
import { en } from '../../apps/web/src/locales/en/index'
import { signIn, signUp, uniqueEmail, verifyEmail } from '../support/app'

test.describe('The account of the visitor', () => {
  test('signs up, verifies the address and signs in again', async ({ page }) => {
    const email = uniqueEmail('signup')

    await signUp(page, email)

    await verifyEmail(page, email)

    await signIn(page, email)

    /**
     * The account has no organization yet, so the setup of the first one is
     * where the visitor lands.
     */
    await expect(page).toHaveURL(/\/onboarding/)
  })

  test('refuses a wrong password', async ({ page }) => {
    const email = uniqueEmail('login')

    await signUp(page, email)

    await page.goto('/login')
    await page.getByLabel(en.email, { exact: true }).fill(email)
    await page.getByLabel(en.password, { exact: true }).fill('the-wrong-password')
    await page.getByRole('button', { name: en.signIn, exact: true }).click()

    await expect(page.getByText(errors.invalid_credentials)).toBeVisible()
  })
})
