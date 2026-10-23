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

/**
 * The monthly price of the paid plan the seed records in `plan_prices`, in
 * cents, the amount of the invoice of a paid period.
 */
const PRO_MONTHLY_AMOUNT_CENTS = 1900

/**
 * The amount as the billing page shows it in English.
 */
const PRO_MONTHLY_AMOUNT = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'USD',
}).format(PRO_MONTHLY_AMOUNT_CENTS / 100)

test.describe('The subscription of the organization', () => {
  test('activates the paid plan and records its invoice with a signed event of the provider', async ({
    page,
  }) => {
    const email = uniqueEmail('billing')
    const slug = uniqueSlug('acme')

    await signUp(page, email)
    await verifyEmail(page, email)
    await createOrganization(page, 'Acme Labs', slug)

    await page.goto(`/app/${slug}/settings/billing`)

    await expect(page.getByText(en.free, { exact: true })).toBeVisible()
    await expect(page.getByText(en.invoicesEmpty, { exact: true })).toBeVisible()

    /**
     * The payment provider confirms the payment with a signed event. The
     * suite signs it the same way the provider does.
     */
    const id = await organizationId(page, slug)
    await activateSubscription(page.request, { organizationId: id, email })

    await page.reload()

    /**
     * The paid plan is named twice: as the current plan and in the invoice of
     * its first period.
     */
    await expect(page.getByText('Pro', { exact: true })).toHaveCount(2)
    await expect(page.getByText(en.statusActive, { exact: true }).first()).toBeVisible()

    /**
     * The paid period appears in the invoices of the organization, with the
     * plan, the price of the plan and the paid state.
     */
    await expect(page.getByText(en.invoicesEmpty, { exact: true })).toBeHidden()
    const invoice = page
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: 'Pro', exact: true }) })
    await expect(invoice).toHaveCount(1)
    await expect(invoice.getByRole('cell', { name: PRO_MONTHLY_AMOUNT, exact: true })).toBeVisible()
    await expect(invoice.getByText(en.invoicePaid, { exact: true })).toBeVisible()
  })
})
