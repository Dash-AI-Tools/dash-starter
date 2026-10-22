import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

/**
 * Fails the flow when the page breaks a rule of accessibility.
 */
export async function checkAccessibility(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze()

  if (results.violations.length === 0) {
    return
  }

  const summary = results.violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `    - ${node.target.join(' ')}\n      ${node.html}`)
        .join('\n')

      return `- ${violation.id}: ${violation.help} (${violation.nodes.length} nodes)\n${nodes}`
    })
    .join('\n')

  throw new Error(`The page breaks the rules of accessibility:\n${summary}`)
}
