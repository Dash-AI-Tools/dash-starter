import { expect, test } from '@playwright/test'
import { en } from '../../apps/web/src/locales/en/index'
import { createOrganization, signUp, uniqueEmail, uniqueSlug, verifyEmail } from '../support/app'
import { linkOf, waitForMail } from '../support/mailpit'

test.describe('The workspace of the visitor', () => {
  test('creates the organization and reaches the dashboard', async ({ page }) => {
    const email = uniqueEmail('onboarding')
    const slug = uniqueSlug('acme')

    await signUp(page, email)
    await verifyEmail(page, email)
    await createOrganization(page, 'Acme Labs', slug)

    await expect(page.getByRole('heading', { name: en.dashboardTitle })).toBeVisible()
  })

  test('invites a teammate that joins the organization', async ({ page, browser }) => {
    const owner = uniqueEmail('owner')
    const teammate = uniqueEmail('teammate')
    const slug = uniqueSlug('acme')

    await signUp(page, owner)
    await verifyEmail(page, owner)
    await createOrganization(page, 'Acme Labs', slug)

    await page.goto(`/app/${slug}/members`)
    await page.getByRole('button', { name: en.inviteTitle, exact: true }).click()
    await page.getByLabel(en.inviteEmail, { exact: true }).fill(teammate)
    await page.getByRole('button', { name: en.inviteSend, exact: true }).click()

    await expect(page.getByText(en.inviteSent)).toBeVisible()

    /**
     * The invitation travels by email: the teammate opens the link it
     * carries.
     */
    const mail = await waitForMail(teammate, 'invited you to')

    /**
     * The teammate is a visitor of its own, with its own session.
     */
    const context = await browser.newContext()
    const invitee = await context.newPage()

    await signUp(invitee, teammate)
    await invitee.goto(linkOf(mail))

    await expect(
      invitee.getByText(en.acceptInviteTitle.replace('{org}', 'Acme Labs'))
    ).toBeVisible()

    await invitee.getByRole('button', { name: en.acceptInvite, exact: true }).click()

    await expect(invitee).toHaveURL(new RegExp(`/app/${slug}`))

    await context.close()
  })
})
