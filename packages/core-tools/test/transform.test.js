import assert from 'node:assert/strict'
import { symlink } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

import { exists } from '../src/files.js'
import { compileTokens, materialize } from '../src/transform.js'
import {
  TOKENS,
  VALUES,
  installFixture,
  read,
  templateTree,
  tempDir,
  writeTree,
} from './helpers.js'

/**
 * A materialized release of the fixture template.
 */
async function materialized(install = installFixture(), tree = templateTree()) {
  const dir = await writeTree(await tempDir('core-release-'), tree)
  const result = await materialize(dir, install)

  return { dir, ...result }
}

test('the tokens are replaced like the installer replaces them', () => {
  const { replace } = compileTokens(TOKENS, VALUES)

  assert.equal(replace('# Dash Starter'), '# Acme AI')
  assert.equal(replace('"@dash/api"'), '"@acme-ai/api"')
  assert.equal(replace('DB_DATABASE=dash_test'), 'DB_DATABASE=acme_ai_test')
  assert.equal(replace('the dashboard of the product'), 'the dashboard of the product')
  assert.equal(replace('POSTGRES_USER: dash'), 'POSTGRES_USER: acme-ai')
})

test('a release is rebranded with the recorded identity', async () => {
  const { dir } = await materialized()

  assert.equal(
    await read(dir, 'apps/api/app/brand.ts'),
    "export const BRAND = 'Acme AI'\nexport const SCOPE = '@acme-ai/api'\n"
  )
  assert.equal(await read(dir, 'apps/web/index.html'), '<title>Acme AI</title>\n')
})

test('the preserved paths keep the name of the template', async () => {
  const { dir } = await materialized()

  assert.equal(
    await read(dir, 'packages/core-tools/src/tool.js'),
    "export const DIR = '.dash'\n// The tools of Dash\n"
  )
  assert.equal(
    await read(dir, 'packages/core-tools/package.json'),
    '{\n  "name": "@dash/core-tools"\n}\n'
  )
})

test('the recorded locale and palette are applied', async () => {
  const { dir } = await materialized()

  assert.equal(
    await read(dir, 'apps/web/src/lib/i18n.tsx'),
    "export const DEFAULT_LOCALE: Locale = 'es'\n"
  )
  assert.equal(
    await read(dir, 'apps/web/src/lib/palettes.ts'),
    "export const DEFAULT_PALETTE: PaletteId = 'forest'\n"
  )
})

test('the installer removals are replayed', async () => {
  const { dir } = await materialized()
  const readme = await read(dir, 'README.md')
  const workflow = await read(dir, '.github/workflows/ci.yml')

  assert.equal(await exists(join(dir, 'packages/create-app')), false)
  assert.equal(await exists(join(dir, 'openspec/changes')), false)
  assert.equal(readme.includes('## The installer'), false)
  assert.equal(readme.includes('packages/create-app'), false)
  assert.equal(readme.includes('## Deployment'), true)
  assert.equal(workflow.includes('installer'), false)
  assert.equal(workflow.includes('npm test'), true)
})

test('a release keeps its showcase while the capability is not removed', async () => {
  const { dir, conflicts } = await materialized()

  assert.equal(await exists(join(dir, 'apps/web/src/pages/ShowcasePage.tsx')), true)
  assert.equal((await read(dir, 'apps/web/src/main.tsx')).includes('ShowcasePage'), true)
  assert.equal(conflicts.size, 0)
})

test('a removed showcase is stripped from the release', async () => {
  const { dir, conflicts } = await materialized(
    installFixture({ removedCapabilities: ['showcase'] })
  )

  for (const file of [
    'apps/web/src/pages/ShowcasePage.tsx',
    'apps/web/src/pages/showcase.test.tsx',
    'apps/web/src/pages/showcase.build.test.ts',
    'apps/web/src/locales/en/showcase.ts',
    'apps/web/src/locales/es/showcase.ts',
  ]) {
    assert.equal(await exists(join(dir, file)), false, file)
  }

  assert.equal(
    await read(dir, 'apps/web/src/main.tsx'),
    [
      "import { createBrowserRouter } from 'react-router'",
      '',
      "const routes = [{ path: '/', element: 'Acme AI' }]",
      '',
      "routes.push({ path: '*' })",
      '',
      'export const router = createBrowserRouter(routes)',
      '',
    ].join('\n')
  )
  assert.equal(
    await read(dir, 'apps/web/src/locales/es/index.ts'),
    [
      "import { common } from './common'",
      '',
      'export const catalogs = {',
      '  common,',
      '}',
      '',
      'export const es = {',
      '  ...common,',
      '}',
      '',
    ].join('\n')
  )
  assert.equal(conflicts.size, 0)
})

test('a release that lost a removal marker is a conflict, not a resurrection', async () => {
  const tree = templateTree({
    'apps/web/src/main.tsx': "routes.push({ lazy: () => import('./pages/ShowcasePage') })\n",
  })
  const { dir, conflicts } = await materialized(
    installFixture({ removedCapabilities: ['showcase'] }),
    tree
  )

  assert.deepEqual([...conflicts.keys()], ['apps/web/src/main.tsx'])
  assert.equal(await exists(join(dir, 'apps/web/src/pages/ShowcasePage.tsx')), false)
})

test('a release that no longer has the showcase at all is no conflict', async () => {
  const tree = templateTree({ 'apps/web/src/main.tsx': 'export const router = null\n' })
  const { conflicts } = await materialized(
    installFixture({ removedCapabilities: ['showcase'] }),
    tree
  )

  assert.equal(conflicts.size, 0)
})

test('an unknown removed capability is refused', async () => {
  await assert.rejects(
    materialized(installFixture({ removedCapabilities: ['billing'] })),
    /Unknown removed capability "billing"/
  )
})

test('a release with a symbolic link is refused before it is read', async () => {
  const dir = await writeTree(await tempDir('core-release-'), templateTree())

  await symlink('/etc/hosts', join(dir, 'apps/web/src/hosts.ts'))

  await assert.rejects(
    materialize(dir, installFixture()),
    /symbolic link at apps\/web\/src\/hosts\.ts/
  )
})
