import { expect, test, type Page } from '@playwright/test'
import { en } from '../../apps/web/src/locales/en/index'
import { es } from '../../apps/web/src/locales/es/index'
import mailEs from '../../apps/api/resources/lang/es/mail.json' with { type: 'json' }
import {
  acceptCookies,
  createOrganization,
  signUp,
  uniqueEmail,
  uniqueSlug,
  verifyEmail,
} from '../support/app'
import { waitForMail } from '../support/mailpit'

/**
 * The English strings that the Spanish catalog translates. A page in Spanish
 * that shows one of them carries a string without translation.
 */
const translated = (Object.entries(en) as [keyof typeof en, string][]).filter(
  ([key, value]) => es[key] !== value
)

/**
 * Asserts that the page does not show a string that the Spanish catalog
 * translates. The words that are the same in both languages, and the words
 * that only look alike, are left alone.
 */
async function expectNoUntranslatedStrings(page: Page): Promise<void> {
  const text = await page.locator('body').innerText()

  for (const [key, value] of translated) {
    const pattern = new RegExp(
      `(?<![\\p{L}])${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`,
      'u'
    )

    if (pattern.test(text)) {
      throw new Error(`The page shows "${value}", the English text of "${key}"`)
    }
  }
}

test.describe('El producto en español', () => {
  test.use({ locale: 'es-ES' })

  test('recorre el producto sin dejar textos sin traducir', async ({ page }) => {
    const email = uniqueEmail('es')
    const slug = uniqueSlug('acme')

    await signUp(page, email, es)

    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    await expectNoUntranslatedStrings(page)

    await acceptCookies(page, es)
    await expectNoUntranslatedStrings(page)

    /**
     * The email is written in the language of the account, so the catcher
     * holds a Spanish message.
     */
    const mail = await waitForMail(email, mailEs.verify_email.subject)

    expect(mail.Text).toContain(mailEs.verify_email.cta)

    await verifyEmail(page, email, mailEs.verify_email.subject)
    await expectNoUntranslatedStrings(page)

    await createOrganization(page, 'Acme Labs', slug, es)
    await expectNoUntranslatedStrings(page)

    await page.goto(`/app/${slug}`)
    await expectNoUntranslatedStrings(page)

    await page.goto(`/app/${slug}/chat`)
    await expect(page.getByText(es.stubBadge, { exact: true })).toBeVisible()

    await page.getByLabel(es.placeholder).fill('¿Cuántos miembros tiene la organización?')
    await page.getByRole('button', { name: es.send, exact: true }).click()

    await expect(
      page.getByRole('paragraph').filter({ hasText: 'This answer comes from the stub provider' })
    ).toBeVisible()

    await expectNoUntranslatedStrings(page)

    await page.goto(`/app/${slug}/settings/billing`)
    await expect(page.getByText(es.free, { exact: true })).toBeVisible()
    await expectNoUntranslatedStrings(page)
  })
})
