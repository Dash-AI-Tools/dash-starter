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
import { activateSubscription, callTool } from '../support/creem'

test.describe('The keys of the organization', () => {
  test('creates a key and calls the MCP server with it', async ({ page }) => {
    const email = uniqueEmail('keys')
    const slug = uniqueSlug('acme')

    await signUp(page, email)
    await verifyEmail(page, email)
    await createOrganization(page, 'Acme Labs', slug)

    /**
     * The MCP server is a feature of the paid plans, so the organization
     * needs one before the key can reach it.
     */
    const id = await organizationId(page, slug)
    await activateSubscription(page.request, { organizationId: id, email })

    await page.goto(`/app/${slug}/settings/api-keys`)

    await page.getByRole('button', { name: en.create, exact: true }).click()
    await page.getByLabel(en.keyName, { exact: true }).fill('Claude Desktop')
    await page.getByRole('button', { name: en.createButton, exact: true }).click()

    /**
     * The secret is only shown once, in the dialog that closes the creation.
     */
    const secret = (await page.locator('code').first().textContent())?.trim() ?? ''

    expect(secret).toMatch(/^dash_/)

    await page.getByRole('button', { name: en.done, exact: true }).click()

    const answer = await callTool(page.request, secret, 'organization_info')

    expect(answer.error).toBeUndefined()
    expect(answer.result?.isError).toBeFalsy()
    expect(answer.result?.content[0]?.text).toContain('Acme Labs')
  })
})
