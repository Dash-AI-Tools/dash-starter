import { expect, test } from '@playwright/test'
import { en } from '../../apps/web/src/locales/en/index'
import { acceptCookies, signIn } from '../support/app'

/**
 * Whether the stack runs in demo mode. The Compose override of the suite
 * reads the same variable, so the suite and the stack always agree.
 */
const DEMO_MODE = (process.env.E2E_DEMO_MODE ?? 'true') === 'true'

/**
 * The account the seed creates in development, with its own organization.
 */
const DEMO_EMAIL = 'demo@example.test'

test.describe('The color palettes', () => {
  test('a visitor tries a palette and a signed-in user saves one', async ({ page, browser }) => {
    test.skip(!DEMO_MODE, 'The palette picker only exists in demo mode')

    await page.goto('/')
    await acceptCookies(page)

    await page.getByRole('button', { name: `${en.paletteLabel}: ${en.paletteLine}` }).click()
    await page.getByRole('menuitemradio', { name: en.palettePlum }).click()

    const root = page.locator('html')
    await expect(root).toHaveAttribute('data-palette', 'plum')

    /**
     * The pick is remembered by the browser, and it is not the palette of
     * the account the visitor signs in with.
     */
    await page.reload()
    await expect(root).toHaveAttribute('data-palette', 'plum')

    await signIn(page, DEMO_EMAIL)
    await expect(page).toHaveURL(/\/app\//)

    /**
     * The picker of the dashboard saves the palette in the account. The pick
     * of the visitor was local, so the saved palette is the one that wins.
     */
    await page.getByRole('button', { name: new RegExp(`^${en.paletteLabel}:`) }).click()
    await page.getByRole('menuitemradio', { name: en.paletteForest }).click()
    await expect(root).toHaveAttribute('data-palette', 'forest')

    await page.reload()
    await expect(root).toHaveAttribute('data-palette', 'forest')

    /**
     * A second device signs in and gets the palette saved in the account.
     */
    const context = await browser.newContext()
    const second = await context.newPage()
    await signIn(second, DEMO_EMAIL)
    await expect(second.locator('html')).toHaveAttribute('data-palette', 'forest')
    await context.close()

    /**
     * Light and dark mode are independent of the palette.
     */
    const profile = new URL(page.url())
    await page.goto(`${profile.pathname.replace(/\/$/, '')}/profile`)

    const theme = page.getByLabel(en.theme, { exact: true })
    await theme.selectOption('dark')

    await expect(root).toHaveClass(/\bdark\b/)
    await expect(root).toHaveAttribute('data-palette', 'forest')

    await theme.selectOption('system')
  })

  test('a new installation shows no palette picker to a visitor', async ({ page }) => {
    test.skip(DEMO_MODE, 'Demo mode shows the palette picker')

    await page.goto('/')

    await expect(page.locator('html')).toHaveAttribute('data-palette', /.+/)
    await expect(page.getByRole('button', { name: new RegExp(`^${en.paletteLabel}`) })).toHaveCount(
      0
    )
  })
})
