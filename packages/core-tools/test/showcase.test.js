import assert from 'node:assert/strict'
import { join } from 'node:path'
import test from 'node:test'

import { main } from '../src/cli.js'
import { exists, sha256 } from '../src/files.js'
import { readCore, readInstall } from '../src/metadata.js'
import { SHOWCASE_FILES, stripShowcaseBlocks, stripShowcaseLines } from '../src/showcase.js'
import {
  generateProject,
  logger,
  read,
  snapshot,
  tempDir,
  templateTree,
  writeTree,
} from './helpers.js'

/**
 * Runs `remove:showcase` on a project.
 */
async function removeShowcase(root) {
  const log = logger()
  const code = await main(['remove:showcase'], { cwd: root, log, error: log })

  return { code, log }
}

/**
 * A checkout of the template, without the `.dash` metadata.
 */
async function checkout(overrides = {}) {
  return writeTree(await tempDir('core-checkout-'), templateTree(overrides))
}

const PROTECTED_FILES = [
  'apps/web/src/pages/Home.tsx',
  'apps/web/src/pages/DashboardPage.tsx',
  'apps/web/src/layouts/AppLayout.tsx',
  'apps/web/src/components/app/sidebar.tsx',
  'packages/ui/src/button.tsx',
  'packages/core-tools/src/tool.js',
]

test('a showcase block is removed with its markers and one of the blank lines around it', () => {
  const content = 'a\n\n// showcase:start\nb\n// showcase:end\n\nc\n'

  assert.deepEqual(stripShowcaseBlocks(content), { content: 'a\n\nc\n', count: 1 })
  assert.equal(
    stripShowcaseBlocks('a\n// showcase:start\nb\n').error,
    '"// showcase:start" has no "// showcase:end"'
  )
  assert.equal(stripShowcaseBlocks('a\n// showcase:end\n').count, 0)
})

test('the marked showcase lines are removed', () => {
  assert.deepEqual(stripShowcaseLines('a\n  showcase, // showcase:line\nb\n'), {
    content: 'a\nb\n',
    count: 1,
  })
})

test('the showcase is removed from a generated project and the removal is recorded', async () => {
  const root = await generateProject()
  const recorded = await readCore(root)
  const { code, log } = await removeShowcase(root)

  assert.equal(code, 0, log.text())

  for (const file of SHOWCASE_FILES) {
    assert.equal(await exists(join(root, file)), false, file)
  }

  for (const file of PROTECTED_FILES) {
    assert.equal(await exists(join(root, file)), true, file)
  }

  const main = await read(root, 'apps/web/src/main.tsx')
  const en = await read(root, 'apps/web/src/locales/en/index.ts')

  assert.equal(main.includes('showcase'), false)
  assert.equal(main.includes('ShowcasePage'), false)
  assert.equal(main.includes("routes.push({ path: '*' })"), true)
  assert.equal(en.includes('showcase'), false)
  assert.equal(en.includes('...common,'), true)

  const install = await readInstall(root)
  const core = await readCore(root)

  assert.deepEqual(install.removedCapabilities, ['showcase'])
  assert.equal(core.checksums['apps/web/src/main.tsx'], sha256(main))
  assert.equal(core.checksums['apps/web/src/locales/en/index.ts'], sha256(en))
  assert.equal(core.checksums['apps/web/src/pages/ShowcasePage.tsx'], undefined)
  assert.equal(
    core.checksums['apps/web/src/lib/nav.ts'],
    recorded.checksums['apps/web/src/lib/nav.ts']
  )
  assert.ok(log.lines.includes('  deleted  apps/web/src/pages/ShowcasePage.tsx'))
  assert.ok(log.lines.includes('  edited   apps/web/src/main.tsx'))
  assert.ok(
    log.lines.includes(
      'Recorded "showcase" in .dash/install.json and refreshed the checksums in .dash/core.json.'
    )
  )
})

test('a second run is a successful no-op', async () => {
  const root = await generateProject()

  assert.equal((await removeShowcase(root)).code, 0)

  const before = await snapshot(root)
  const { code, log } = await removeShowcase(root)

  assert.equal(code, 0)
  assert.deepEqual(log.lines, ['The showcase is already removed: nothing changed.'])
  assert.deepEqual(await snapshot(root), before)
})

test('a missing marker aborts with no change', async () => {
  const root = await generateProject()

  await writeTree(root, {
    'apps/web/src/main.tsx': "routes.push({ lazy: () => import('./pages/ShowcasePage') })\n",
  })

  const before = await snapshot(root)
  const { code, log } = await removeShowcase(root)

  assert.equal(code, 1)
  assert.ok(
    log.lines.includes(
      '  apps/web/src/main.tsx has no "// showcase:start" … "// showcase:end" marker'
    )
  )
  assert.ok(log.lines.includes('Nothing was changed.'))
  assert.deepEqual(await snapshot(root), before)
})

test('a showcase catalog imported elsewhere aborts with no change', async () => {
  const root = await generateProject()

  await writeTree(root, {
    'apps/web/src/pages/AboutPage.tsx': "import { showcase } from '@/locales/en/showcase'\n",
  })

  const before = await snapshot(root)
  const { code, log } = await removeShowcase(root)

  assert.equal(code, 1)
  assert.ok(
    log.lines.includes(
      '  apps/web/src/pages/AboutPage.tsx still references the showcase: remove that reference first'
    )
  )
  assert.deepEqual(await snapshot(root), before)
})

test('a core file the team had modified keeps its old checksum', async () => {
  const root = await generateProject()
  const recorded = (await readCore(root)).checksums['apps/web/src/main.tsx']
  const main = await read(root, 'apps/web/src/main.tsx')

  await writeTree(root, { 'apps/web/src/main.tsx': `${main}// mine\n` })

  assert.equal((await removeShowcase(root)).code, 0)
  assert.equal((await readCore(root)).checksums['apps/web/src/main.tsx'], recorded)
  assert.equal((await read(root, 'apps/web/src/main.tsx')).endsWith('// mine\n'), true)
})

test('the template checkout removes the showcase and reports that nothing was recorded', async () => {
  const root = await checkout()
  const { code, log } = await removeShowcase(root)

  assert.equal(code, 0, log.text())
  assert.equal(await exists(join(root, 'apps/web/src/pages/ShowcasePage.tsx')), false)
  assert.equal(await exists(join(root, '.dash')), false)
  assert.ok(
    log.lines.includes('No update metadata (.dash/) was found, so the removal was not recorded.')
  )
})

test('a corrupt metadata file aborts with no change', async () => {
  const root = await generateProject()

  await writeTree(root, { '.dash/install.json': '{ broken' })

  const before = await snapshot(root)
  const { code, log } = await removeShowcase(root)

  assert.equal(code, 1)
  assert.match(log.text(), /install\.json is corrupt/)
  assert.deepEqual(await snapshot(root), before)
})
