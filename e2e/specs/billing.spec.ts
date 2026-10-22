import { expect, test } from '@playwright/test'
import { en } from '../../apps/web/src/locales/en/index'
import {
  createOrganization,
  organizationId,
  signUp,
  uniqueEmail,
  uniqueSlug,
  verifyEmail,
} from '../support/app'
import { activateSubscription } from '../support/creem'

test.describe('The subscription of the organization', () => {
  test('activates the paid plan with a signed event of the provider', async ({ page }) => {
    const email = uniqueEmail('billing')
    const slug = uniqueSlug('acme')

    await signUp(page, email)
    await verifyEmail(page, email)
    await createOrganization(page, 'Acme Labs', slug)

    await page.goto(`/app/${slug}/settings/billing`)

    await expect(page.getByText(en.free, { exact: true })).toBeVisible()

    /**
     * The payment provider confirms the payment with a signed event. The
     * suite signs it the same way the provider does.
     */
    const id = await organizationId(page, slug)
    await activateSubscription(page.request, { organizationId: id, email })

    await page.reload()

    await expect(page.getByText('Pro', { exact: true })).toBeVisible()
    await expect(page.getByText(en.statusActive, { exact: true }).first()).toBeVisible()
  })
})
