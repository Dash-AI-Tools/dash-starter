import { expect, test } from '@playwright/test'
import { en } from '../../apps/web/src/locales/en/index'
import { es } from '../../apps/web/src/locales/es/index'
import { checkAccessibility } from '../support/axe'

test.describe('The preferences of the visitor', () => {
  test('switches the language of the site', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: en.appName })).toBeVisible()

    await page.getByRole('button', { name: en.spanish, exact: true }).click()

    /**
     * The language is kept in a cookie, so the next page opens in it.
     */
    await expect(page.getByRole('banner').getByRole('link', { name: es.pricingNav })).toBeVisible()

    await page.reload()

    await expect(page.getByRole('banner').getByRole('link', { name: es.pricingNav })).toBeVisible()
  })

  test('accepts the cookies and stops asking', async ({ page }) => {
    await page.goto('/')

    const banner = page.getByRole('region', { name: en.bannerTitle })

    await expect(banner).toBeVisible()

    await checkAccessibility(page)

    await banner.getByRole('button', { name: en.acceptAll, exact: true }).click()

    await expect(banner).toBeHidden()

    /**
     * The choice lives in a cookie, so the banner does not come back.
     */
    await page.reload()

    await expect(page.getByRole('region', { name: en.bannerTitle })).toBeHidden()
  })
})
