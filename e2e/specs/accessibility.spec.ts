import { expect, test } from '@playwright/test'
import { checkAccessibility } from '../support/axe'

test.describe('The public pages', () => {
  test('has no accessibility violation on the landing page', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await checkAccessibility(page)
  })

  test('has no accessibility violation on the pricing page', async ({ page }) => {
    await page.goto('/pricing')

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await checkAccessibility(page)
  })
})
