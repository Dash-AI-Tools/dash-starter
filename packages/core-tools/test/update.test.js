import assert from 'node:assert/strict'
import { readdir, symlink, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

import { main } from '../src/cli.js'
import { exists, sha256 } from '../src/files.js'
import { CORE_FILE, readCore } from '../src/metadata.js'
import { classify } from '../src/update.js'
import {
  generateProject,
  logger,
  network,
  read,
  snapshot,
  tempDir,
  templateTree,
  writeTree,
} from './helpers.js'

/**
 * Runs a command of the tools on a project, against a release made of the
 * given template tree.
 */
async function core(root, argv, tree = templateTree(), extra = {}) {
  const log = logger()
  const tmp = await tempDir('core-tmp-')
  const seams = network(tree)
  const code = await main(argv, { cwd: root, log, error: log, tmp, ...seams, ...extra })

  return { code, log, tmp, calls: seams.calls }
}

/**
 * A release that changes the given template files.
 */
const release = (overrides) => templateTree(overrides)

test('the classification follows the recorded, local and upstream checksums', () => {
  const [a, b, c] = ['sha256:a', 'sha256:b', 'sha256:c']

  assert.deepEqual(classify({ recorded: a, local: a, upstream: b }), {
    action: 'update',
    record: b,
  })
  assert.deepEqual(classify({ recorded: a, local: a, upstream: a }), { action: 'none', record: a })
  assert.deepEqual(classify({ recorded: a, local: a, upstream: null }), {
    action: 'delete',
    record: null,
  })
  assert.deepEqual(classify({ recorded: null, local: null, upstream: b }), {
    action: 'add',
    record: b,
  })
  assert.deepEqual(classify({ recorded: a, local: c, upstream: b }), {
    action: 'modified',
    record: a,
    reason: null,
  })
  assert.deepEqual(classify({ recorded: a, local: c, upstream: a }), { action: 'none', record: a })
  assert.deepEqual(classify({ recorded: a, local: b, upstream: b }), { action: 'none', record: b })
  assert.deepEqual(classify({ recorded: a, local: null, upstream: b }), {
    action: 'modified',
    record: a,
    reason: 'deleted locally',
  })
  assert.deepEqual(classify({ recorded: a, local: c, upstream: null }), {
    action: 'modified',
    record: a,
    reason: 'deleted upstream',
  })
  assert.deepEqual(classify({ recorded: null, local: c, upstream: null }), {
    action: 'untracked',
    record: null,
  })
  assert.equal(classify({ recorded: null, local: c, upstream: b }).action, 'conflict')
})

test('an untouched core file is updated with the identity of the project', async () => {
  const root = await generateProject()
  const tree = release({
    'apps/api/app/brand.ts': "export const BRAND = 'Dash'\nexport const NEW = 'Dash Starter'\n",
  })

  const { code, log } = await core(root, ['update', '--to', '0.2.0'], tree)
  const brand = await read(root, 'apps/api/app/brand.ts')
  const metadata = await readCore(root)

  assert.equal(code, 0, log.text())
  assert.equal(brand, "export const BRAND = 'Acme AI'\nexport const NEW = 'Acme AI'\n")
  assert.equal(brand.includes('Dash'), false)
  assert.equal(metadata.version, '0.2.0')
  assert.equal(metadata.checksums['apps/api/app/brand.ts'], sha256(brand))
  assert.ok(log.lines.includes('Updated (1):'))
  assert.ok(log.lines.includes('  apps/api/app/brand.ts'))
})

test('a locally modified core file is kept, reported and fails the update', async () => {
  const root = await generateProject()
  const recorded = (await readCore(root)).checksums['apps/web/src/lib/nav.ts']

  await writeTree(root, { 'apps/web/src/lib/nav.ts': "export const NAV = ['mine']\n" })

  const tree = release({ 'apps/web/src/lib/nav.ts': "export const NAV = ['dashboard', 'chat']\n" })
  const { code, log } = await core(root, ['update', '--to', '0.2.0'], tree)
  const metadata = await readCore(root)

  assert.equal(code, 1)
  assert.equal(await read(root, 'apps/web/src/lib/nav.ts'), "export const NAV = ['mine']\n")
  assert.ok(log.lines.includes('Modified locally, kept as they are (1):'))
  assert.ok(log.lines.includes('  apps/web/src/lib/nav.ts'))
  assert.equal(metadata.checksums['apps/web/src/lib/nav.ts'], recorded)
  assert.equal(metadata.version, '0.2.0')

  const again = await core(root, ['update', '--to', '0.2.0'], tree)

  assert.equal(again.code, 1, 'the kept file is reported again')
  assert.ok(again.log.lines.includes('  apps/web/src/lib/nav.ts'))
})

test('a file added upstream is written and an untouched one removed upstream is deleted', async () => {
  const root = await generateProject()
  const tree = release({
    'apps/web/src/lib/new-helper.ts': "export const NAME = 'Dash'\n",
    'apps/web/src/pages/Home.tsx': null,
  })

  const { code, log } = await core(root, ['update', '--to', '0.2.0'], tree)
  const metadata = await readCore(root)

  assert.equal(code, 0, log.text())
  assert.equal(
    await read(root, 'apps/web/src/lib/new-helper.ts'),
    "export const NAME = 'Acme AI'\n"
  )
  assert.equal(await exists(join(root, 'apps/web/src/pages/Home.tsx')), false)
  assert.ok(metadata.checksums['apps/web/src/lib/new-helper.ts'])
  assert.equal(metadata.checksums['apps/web/src/pages/Home.tsx'], undefined)
})

test('a file the project created inside a core path is kept and reported', async () => {
  const root = await generateProject()

  await writeTree(root, { 'apps/web/src/lib/mine.ts': 'export const MINE = 1\n' })

  const { code, log } = await core(root, ['update', '--to', '0.1.0'])

  assert.equal(code, 0)
  assert.equal(await read(root, 'apps/web/src/lib/mine.ts'), 'export const MINE = 1\n')
  assert.ok(log.lines.includes('Not tracked by the core, kept as they are (1):'))
  assert.ok(log.lines.includes('  apps/web/src/lib/mine.ts'))
  assert.equal((await readCore(root)).checksums['apps/web/src/lib/mine.ts'], undefined)
})

test('a file the project created where the release adds one is a conflict', async () => {
  const root = await generateProject()

  await writeTree(root, { 'apps/web/src/lib/new-helper.ts': 'mine\n' })

  const tree = release({ 'apps/web/src/lib/new-helper.ts': 'theirs\n' })
  const { code, log } = await core(root, ['update', '--to', '0.2.0'], tree)

  assert.equal(code, 1)
  assert.equal(await read(root, 'apps/web/src/lib/new-helper.ts'), 'mine\n')
  assert.ok(log.lines.includes('Conflicts, kept as they are (1):'))
})

test('the files the project owns are never written', async () => {
  const root = await generateProject()
  const before = await snapshot(root)
  const tree = release({
    'apps/web/src/features/index.ts': '// replaced upstream\n',
    'packages/ui/src/custom/index.ts': '// replaced upstream\n',
    'docs/guide.md': '# A new guide\n',
    'README.md': '# A new readme\n',
  })

  const { code, log } = await core(root, ['update', '--to', '0.2.0'], tree)
  const after = await snapshot(root)

  assert.equal(code, 0, log.text())

  for (const file of [
    'apps/web/src/features/index.ts',
    'packages/ui/src/custom/index.ts',
    'docs/guide.md',
    'README.md',
  ]) {
    assert.equal(after[file], before[file], file)
  }
})

test('the locale and the palette of the project survive an update', async () => {
  const root = await generateProject()
  const tree = release({
    'apps/web/src/lib/i18n.tsx':
      "export const DEFAULT_LOCALE: Locale = 'en'\nexport const NEW = 1\n",
    'apps/web/src/lib/palettes.ts':
      "export const DEFAULT_PALETTE: PaletteId = 'line'\nexport const NEW = 1\n",
  })

  const { code } = await core(root, ['update', '--to', '0.2.0'], tree)

  assert.equal(code, 0)
  assert.equal(
    await read(root, 'apps/web/src/lib/i18n.tsx'),
    "export const DEFAULT_LOCALE: Locale = 'es'\nexport const NEW = 1\n"
  )
  assert.equal(
    await read(root, 'apps/web/src/lib/palettes.ts'),
    "export const DEFAULT_PALETTE: PaletteId = 'forest'\nexport const NEW = 1\n"
  )
})

test('the same release is no change and writes nothing', async () => {
  const root = await generateProject()
  const before = await snapshot(root)

  const update = await core(root, ['update', '--to', '0.1.0'])
  const check = await core(root, ['check', '--to', '0.1.0'])

  assert.equal(update.code, 0)
  assert.equal(check.code, 0)
  assert.ok(update.log.lines.includes('No changes: the core already matches 0.1.0.'))
  assert.deepEqual(await snapshot(root), before)
})

test('a repeated update reports no changes and writes nothing', async () => {
  const root = await generateProject()
  const tree = release({ 'apps/web/src/lib/nav.ts': "export const NAV = ['dashboard', 'chat']\n" })

  assert.equal((await core(root, ['update', '--to', '0.2.0'], tree)).code, 0)

  const before = await snapshot(root)
  const again = await core(root, ['update', '--to', '0.2.0'], tree)

  assert.equal(again.code, 0)
  assert.ok(again.log.lines.includes('No changes: the core already matches 0.2.0.'))
  assert.deepEqual(await snapshot(root), before)
})

test('the latest release is used when no version is given', async () => {
  const root = await generateProject()
  const { code, calls } = await core(root, ['check'])

  assert.equal(code, 1, 'the version moves from 0.1.0 to 0.2.0')
  assert.deepEqual(calls.fetch, [
    'https://api.github.com/repos/Dash-AI-Tools/dash-starter/releases/latest',
  ])
  assert.deepEqual(calls.download, ['github:Dash-AI-Tools/dash-starter#v0.2.0'])
})

test('a dry run lists the pending changes and leaves every byte as it was', async () => {
  const root = await generateProject()
  const before = await snapshot(root)
  const tree = release({ 'apps/web/src/lib/nav.ts': "export const NAV = ['dashboard', 'chat']\n" })

  const { code, log } = await core(root, ['update', '--dry-run', '--to', '0.2.0'], tree)

  assert.equal(code, 1)
  assert.equal(
    log.lines[0],
    'Core update preview (dry run): 0.1.0 -> 0.2.0 (github:Dash-AI-Tools/dash-starter)'
  )
  assert.ok(log.lines.includes('Would update (1):'))
  assert.ok(log.lines.includes('  apps/web/src/lib/nav.ts'))
  assert.ok(log.lines.includes('Nothing was written.'))
  assert.deepEqual(await snapshot(root), before)
})

test('a check reports the pending changes and writes nothing', async () => {
  const root = await generateProject()
  const before = await snapshot(root)
  const tree = release({ 'apps/web/src/lib/nav.ts': "export const NAV = ['dashboard', 'chat']\n" })

  const { code, log } = await core(root, ['check', '--to', '0.2.0'], tree)

  assert.equal(code, 1)
  assert.equal(log.lines[0], 'Core check: 0.1.0 -> 0.2.0 (github:Dash-AI-Tools/dash-starter)')
  assert.ok(log.lines.includes('Nothing was written. Run core:update to apply.'))
  assert.deepEqual(await snapshot(root), before)
})

test('a download failure exits non-zero and leaves the project intact', async () => {
  const root = await generateProject()
  const before = await snapshot(root)

  const { code, log, tmp } = await core(root, ['update', '--to', '0.2.0'], templateTree(), {
    download: async () => {
      throw new Error('getaddrinfo ENOTFOUND codeload.github.com')
    },
  })

  assert.equal(code, 1)
  assert.match(log.text(), /could not be downloaded: getaddrinfo ENOTFOUND/)
  assert.deepEqual(await snapshot(root), before)
  assert.deepEqual(await readdir(tmp), [])
})

test('a release with an unsafe path exits non-zero and writes nothing', async () => {
  const root = await generateProject()
  const before = await snapshot(root)
  const outside = await tempDir()

  const { code, log } = await core(root, ['update', '--to', '0.2.0'], templateTree(), {
    download: async (source, { dir }) => {
      await writeTree(dir, release({ 'apps/web/src/lib/nav.ts': 'changed\n' }))
      await symlink(join(outside, 'escape.ts'), join(dir, 'apps/web/src/lib/escape.ts'))
    },
  })

  assert.equal(code, 1)
  assert.match(log.text(), /symbolic link at apps\/web\/src\/lib\/escape\.ts/)
  assert.deepEqual(await snapshot(root), before)
  assert.deepEqual(await readdir(outside), [])
})

test('a recorded path outside the project exits non-zero and writes nothing', async () => {
  const root = await generateProject()
  const metadata = JSON.parse(await read(root, CORE_FILE))

  metadata.checksums['../outside.ts'] = sha256('x')
  await writeFile(join(root, CORE_FILE), JSON.stringify(metadata))

  const before = await snapshot(root)
  const { code, log } = await core(
    root,
    ['update', '--to', '0.2.0'],
    release({ 'apps/web/src/lib/nav.ts': 'x\n' })
  )

  assert.equal(code, 1)
  assert.match(log.text(), /Unsafe path: "\.\.\/outside\.ts"/)
  assert.deepEqual(await snapshot(root), before)
})

test('the manifests the project owns are reported, not written', async () => {
  const root = await generateProject()
  const before = await read(root, 'package.json')
  const manifest = JSON.parse(before)

  manifest.scripts.storybook = 'npm run storybook -w @dash/ui'
  manifest.devDependencies.prettier = '^3.9.9'

  const tree = release({ 'package.json': `${JSON.stringify(manifest, null, 2)}\n` })
  const { code, log } = await core(root, ['update', '--to', '0.2.0'], tree)

  assert.equal(code, 0)
  assert.equal(await read(root, 'package.json'), before)
  assert.ok(log.lines.includes('  package.json'))
  assert.ok(log.lines.includes('    scripts.storybook: "npm run storybook -w @acme-ai/ui"'))
  assert.ok(log.lines.includes('    devDependencies.prettier: "^3.9.9" (yours: "^3.0.0")'))
})

test('a removed showcase stays removed and is no conflict', async () => {
  const root = await generateProject()

  assert.equal((await core(root, ['remove:showcase'])).code, 0)

  const tree = release({ 'apps/web/src/lib/nav.ts': "export const NAV = ['dashboard', 'chat']\n" })
  const { code, log } = await core(root, ['update', '--to', '0.2.0'], tree)

  assert.equal(code, 0, log.text())
  assert.equal(log.text().includes('Conflicts'), false)
  assert.equal(log.text().includes('showcase'), false)
  assert.equal(await exists(join(root, 'apps/web/src/pages/ShowcasePage.tsx')), false)
  assert.equal(await exists(join(root, 'apps/web/src/locales/en/showcase.ts')), false)
  assert.equal((await read(root, 'apps/web/src/main.tsx')).includes('ShowcasePage'), false)
  assert.equal((await read(root, 'apps/web/src/locales/es/index.ts')).includes('showcase'), false)
  assert.ok(log.lines.includes('  apps/web/src/lib/nav.ts'))

  const again = await core(root, ['check', '--to', '0.2.0'], tree)

  assert.equal(again.code, 0, again.log.text())
})

test('a release that lost a showcase marker leaves the file and reports a conflict', async () => {
  const root = await generateProject()

  assert.equal((await core(root, ['remove:showcase'])).code, 0)

  const main = await read(root, 'apps/web/src/main.tsx')
  const tree = release({
    'apps/web/src/main.tsx': "routes.push({ lazy: () => import('./pages/ShowcasePage') })\n",
  })
  const { code, log } = await core(root, ['update', '--to', '0.2.0'], tree)

  assert.equal(code, 1)
  assert.equal(await read(root, 'apps/web/src/main.tsx'), main)
  assert.ok(
    log.lines.includes(
      '  apps/web/src/main.tsx (the release reaches the showcase outside its removal markers)'
    )
  )
})

test('the report of an update lists every class of change', async () => {
  const root = await generateProject()

  await writeTree(root, {
    'apps/web/src/lib/nav.ts': "export const NAV = ['mine']\n",
    'apps/web/src/lib/mine.ts': 'mine\n',
  })

  const manifest = JSON.parse(await read(root, 'package.json'))

  manifest.scripts.storybook = 'npm run storybook -w @dash/ui'

  const tree = release({
    'package.json': `${JSON.stringify(manifest, null, 2)}\n`,
    'apps/api/app/brand.ts': "export const BRAND = 'Dash'\n",
    'apps/web/src/lib/nav.ts': "export const NAV = ['dashboard', 'chat']\n",
    'apps/web/src/lib/new-helper.ts': 'export const NEW = 1\n',
    'apps/web/src/pages/Home.tsx': null,
  })

  const { code, log } = await core(root, ['update', '--to', '0.2.0'], tree)

  assert.equal(code, 1)
  assert.equal(
    log.text(),
    [
      'Core update: 0.1.0 -> 0.2.0 (github:Dash-AI-Tools/dash-starter)',
      '',
      'Updated (1):',
      '  apps/api/app/brand.ts',
      '',
      'Added (1):',
      '  apps/web/src/lib/new-helper.ts',
      '',
      'Deleted (1):',
      '  apps/web/src/pages/Home.tsx',
      '',
      'Modified locally, kept as they are (1):',
      '  apps/web/src/lib/nav.ts',
      '',
      'Not tracked by the core, kept as they are (1):',
      '  apps/web/src/lib/mine.ts',
      '',
      'Manifest changes in the release (apply them by hand, then run npm install):',
      '  package.json',
      '    scripts.storybook: "npm run storybook -w @acme-ai/ui"',
      '',
      'Some core files were kept as they are. Compare them with the release, merge by hand,',
      'and keep customizations in the feature folders so the next update can replace the core.',
    ].join('\n')
  )
})

test('the tools update themselves, untouched by the identity', async () => {
  const root = await generateProject()
  const tree = release({
    'packages/core-tools/src/tool.js': "export const DIR = '.dash'\n// The tools of Dash, v2\n",
  })

  const { code, log } = await core(root, ['update', '--to', '0.2.0'], tree)

  assert.equal(code, 0, log.text())
  assert.equal(
    await read(root, 'packages/core-tools/src/tool.js'),
    "export const DIR = '.dash'\n// The tools of Dash, v2\n"
  )
  assert.ok(log.lines.includes('  packages/core-tools/src/tool.js'))
})

test('a failure while the tools replace themselves leaves every original file', async () => {
  const root = await generateProject()
  const before = await snapshot(root)
  const tree = release({
    'apps/web/src/lib/nav.ts': "export const NAV = ['dashboard', 'chat']\n",
    'packages/core-tools/bin/core.js': "import '../src/tool.js'\n// v2\n",
    'packages/core-tools/src/tool.js': "export const DIR = '.dash'\n// v2\n",
  })

  const { code, log } = await core(root, ['update', '--to', '0.2.0'], tree, {
    write: async (path, content) => {
      if (path.includes('packages/core-tools/src/tool.js')) throw new Error('EIO: i/o error')
      await writeFile(path, content)
    },
  })

  assert.equal(code, 1)
  assert.match(log.text(), /EIO/)
  assert.deepEqual(await snapshot(root), before)
})

test('a project without metadata cannot be updated', async () => {
  const root = await writeTree(await tempDir(), { 'package.json': '{ "workspaces": [] }' })

  const { code, log } = await core(root, ['check'])

  assert.equal(code, 1)
  assert.match(log.text(), /\.dash\/core\.json was not found/)
})

test('a core file deleted locally and unchanged upstream stays deleted', async () => {
  const root = await generateProject()

  await unlink(join(root, 'apps/web/src/pages/Home.tsx'))

  const { code } = await core(root, ['update', '--to', '0.1.0'])

  assert.equal(code, 0)
  assert.equal(await exists(join(root, 'apps/web/src/pages/Home.tsx')), false)
})

/**
 * The network of a test that must never use it: a local template replaces the
 * download.
 */
const offline = {
  fetch: async () => {
    throw new Error('the network was used')
  },
  download: async () => {
    throw new Error('the network was used')
  },
}

test('a local template is used instead of a download', async () => {
  const root = await generateProject()
  const source = await tempDir('core-source-')

  await writeTree(
    source,
    release({
      'package.json': '{\n  "name": "dash-starter",\n  "version": "0.2.0"\n}\n',
      'apps/api/app/brand.ts': "export const BRAND = 'Dash'\nexport const NEW = 'Dash'\n",
    })
  )

  const { code, log } = await core(root, ['update', '--source', source], undefined, offline)
  const metadata = await readCore(root)

  assert.equal(code, 0, log.text())
  assert.equal(
    await read(root, 'apps/api/app/brand.ts'),
    "export const BRAND = 'Acme AI'\nexport const NEW = 'Acme AI'\n"
  )
  assert.equal(metadata.version, '0.2.0')
  assert.equal(await exists(join(source, '.dash')), false)
})

test('a local template that matches the project is no change', async () => {
  const root = await generateProject()
  const source = await tempDir('core-source-')
  const before = await snapshot(root)

  await writeTree(source, templateTree())

  const { code, log } = await core(
    root,
    ['check', '--source', source, '--to', '0.1.0'],
    undefined,
    offline
  )

  assert.equal(code, 0, log.text())
  assert.deepEqual(await snapshot(root), before)
})

test('a local template without a package.json is refused before any write', async () => {
  const root = await generateProject()
  const source = await tempDir('core-source-')
  const before = await snapshot(root)

  await writeTree(source, { 'apps/api/app/brand.ts': "export const BRAND = 'Dash'\n" })

  const { code } = await core(root, ['update', '--source', source], undefined, offline)

  assert.equal(code, 1)
  assert.deepEqual(await snapshot(root), before)
})
