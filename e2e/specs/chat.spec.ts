import { expect, test, type Page } from '@playwright/test'
import { en } from '../../apps/web/src/locales/en/index'
import {
  acceptCookies,
  createOrganization,
  signUp,
  uniqueEmail,
  uniqueSlug,
  verifyEmail,
} from '../support/app'
import { checkAccessibility } from '../support/axe'

/**
 * The reply of the assistant: the paragraph of the message, not the list of
 * the conversations.
 */
function answer(page: Page) {
  return page.getByRole('paragraph').filter({ hasText: 'This answer comes from the stub provider' })
}

const QUESTION = 'How many members does the organization have?'

test.describe('The assistant of the organization', () => {
  test('answers the question of a member', async ({ page }) => {
    const email = uniqueEmail('chat')
    const slug = uniqueSlug('acme')

    await signUp(page, email)
    await acceptCookies(page)
    await verifyEmail(page, email)
    await createOrganization(page, 'Acme Labs', slug)

    await page.goto(`/app/${slug}/chat`)

    /**
     * The stack has no provider configured, so the answers come from the
     * stub.
     */
    await expect(page.getByText(en.stubBadge, { exact: true })).toBeVisible()

    await checkAccessibility(page)

    await page.getByLabel(en.placeholder).fill(QUESTION)
    await page.getByRole('button', { name: en.send, exact: true }).click()

    await expect(answer(page)).toBeVisible()

    /**
     * The conversation is kept by the server, so it is there when the page is
     * opened again.
     */
    await page.reload()

    /**
     * The stub cannot write a title, so the conversation is named after the
     * question.
     */
    await page.getByRole('button', { name: QUESTION, exact: true }).click()

    await expect(answer(page)).toBeVisible()
  })
})
