import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '../../..')

/**
 * The commands that would build or publish the stories, rather than serve
 * them on the machine of a developer.
 */
const BUILDS = /build-storybook|storybook\s+build|storybook-static/

/**
 * The files that build, ship or deploy the product.
 */
async function deliveryFiles() {
  const workflows = await readdir(path.join(root, '.github/workflows')).catch(() => [])
  const compose = (await readdir(root)).filter((file) => /^docker-compose.*\.ya?ml$/.test(file))

  return [
    ...workflows.map((file) => `.github/workflows/${file}`),
    ...compose,
    'apps/web/Dockerfile',
    'apps/api/Dockerfile',
  ]
}

/**
 * Storybook is a local tool: no workflow, image or build script produces it,
 * so it can never reach CI artifacts or a deployment.
 */
describe('Storybook stays local', () => {
  it('is built by no workflow, image or compose file', async () => {
    const offenders = []

    for (const file of await deliveryFiles()) {
      const content = await readFile(path.join(root, file), 'utf8').catch(() => '')
      if (BUILDS.test(content)) offenders.push(file)
    }

    expect(offenders).toEqual([])
  })

  it('is left out of the build scripts of the workspaces', async () => {
    const manifests = ['package.json', 'packages/ui/package.json', 'apps/web/package.json']

    for (const file of manifests) {
      const { scripts = {} } = JSON.parse(await readFile(path.join(root, file), 'utf8'))

      expect(`${scripts.build ?? ''}`).not.toMatch(/storybook/)
      expect(Object.values(scripts).join('\n')).not.toMatch(BUILDS)
    }
  })
})
