import { expect, test } from '@playwright/test'
import { en } from '../../apps/web/src/locales/en/index'
import {
  acceptCookies,
  createOrganization,
  signUp,
  uniqueEmail,
  uniqueSlug,
  verifyEmail,
} from '../support/app'

test.describe('The bulk import', () => {
  test('imports a CSV as invitations and shows the pending ones', async ({ page }) => {
    const owner = uniqueEmail('owner')
    const first = uniqueEmail('first')
    const second = uniqueEmail('second')
    const slug = uniqueSlug('acme')

    await signUp(page, owner)
    await verifyEmail(page, owner)
    await createOrganization(page, 'Acme Labs', slug)
    await acceptCookies(page)

    await page.goto(`/app/${slug}/members`)
    await page.getByRole('link', { name: en.importMembers, exact: true }).click()

    await expect(page.getByRole('heading', { name: en.importTitle })).toBeVisible()

    await page.locator('input[type="file"]').setInputFiles({
      name: 'team.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`email,role\n${first},member\n${second},admin\n`),
    })

    await page.getByRole('button', { name: en.importSubmit, exact: true }).click()

    await expect(
      page.getByText(en.importDone.replace('{imported}', '2').replace('{total}', '2'))
    ).toBeVisible()
    await expect(page.getByText(en.importNoErrors)).toBeVisible()

    /**
     * The addresses are invitations, not members: they wait for an answer in
     * the members page.
     */
    await page.getByRole('main').getByRole('link', { name: en.membersTitle, exact: true }).click()

    await expect(page.getByRole('heading', { name: en.invitationsTitle })).toBeVisible()
    await expect(page.getByText(first)).toBeVisible()
    await expect(page.getByText(second)).toBeVisible()
  })
})
