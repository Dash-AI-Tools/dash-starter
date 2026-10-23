import assert from 'node:assert/strict'
import { mkdir, readdir, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'

import {
  applyOperations,
  assertRelative,
  assertSafePath,
  globToRegExp,
  sha256,
} from '../src/files.js'
import {
  CORE_FILE,
  INSTALL_FILE,
  computeChecksums,
  findProjectRoot,
  isCorePath,
  readCore,
  readInstall,
  serializeMetadata,
} from '../src/metadata.js'
import { generateProject, read, snapshot, tempDir, writeTree } from './helpers.js'

test('a checksum is the sha256 of the bytes, in the recorded form', () => {
  assert.equal(
    sha256('hello'),
    'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
  )
})

test('a glob matches the paths of the manifest', () => {
  assert.equal(globToRegExp('apps/web/src/**').test('apps/web/src/lib/nav.ts'), true)
  assert.equal(globToRegExp('apps/web/tsconfig*.json').test('apps/web/tsconfig.app.json'), true)
  assert.equal(globToRegExp('**/.env*').test('apps/api/.env'), true)
  assert.equal(globToRegExp('**/.env*').test('.env'), true)
})

test('the user-owned globs win over the core globs', () => {
  assert.equal(isCorePath('apps/web/src/lib/nav.ts'), true)
  assert.equal(isCorePath('apps/web/src/features/index.ts'), false)
  assert.equal(isCorePath('apps/api/app/features/invoices/routes.ts'), false)
  assert.equal(isCorePath('apps/api/tests/functional/features/invoices.spec.ts'), false)
  assert.equal(isCorePath('apps/api/tests/functional/health.spec.ts'), true)
  assert.equal(isCorePath('packages/ui/src/custom/data-card.tsx'), false)
  assert.equal(isCorePath('packages/ui/package.json'), true)
  assert.equal(isCorePath('packages/core-tools/src/cli.js'), true)
  assert.equal(isCorePath('apps/web/package.json'), false)
  assert.equal(isCorePath('README.md'), false)
})

test('the metadata of a generated project is read back', async () => {
  const root = await generateProject()

  const install = await readInstall(root)
  const core = await readCore(root)

  assert.equal(install.locale, 'es')
  assert.deepEqual(install.removedCapabilities, [])
  assert.equal(core.version, '0.1.0')
  assert.equal(
    core.checksums['apps/web/src/main.tsx'],
    sha256(await read(root, 'apps/web/src/main.tsx'))
  )
  assert.equal(core.checksums['apps/web/src/features/index.ts'], undefined)
  assert.equal(core.checksums['package.json'], undefined)
})

test('the checksums cover every core file and nothing else', async () => {
  const root = await tempDir()

  await writeTree(root, {
    'apps/web/src/a.ts': 'a',
    'apps/web/src/features/b.ts': 'b',
    'apps/web/node_modules/x/index.js': 'x',
    'docs/c.md': 'c',
  })

  assert.deepEqual(Object.keys(await computeChecksums(root)), ['apps/web/src/a.ts'])
})

test('a missing manifest is reported', async () => {
  const root = await tempDir()

  await assert.rejects(readCore(root), /\.dash\/core\.json was not found/)
  await assert.rejects(readInstall(root), /\.dash\/install\.json was not found/)
})

test('a corrupt manifest is reported', async () => {
  const root = await tempDir()

  await writeTree(root, { [CORE_FILE]: '{ not json', [INSTALL_FILE]: '[]' })

  await assert.rejects(readCore(root), /core\.json is corrupt: it is not valid JSON/)
  await assert.rejects(readInstall(root), /install\.json is corrupt: it is not an object/)
})

test('a manifest with another schema version or a bad checksum is refused', async () => {
  const root = await tempDir()
  const core = {
    schemaVersion: 1,
    repository: 'github:a/b',
    version: '0.1.0',
    core: [],
    userOwned: [],
    checksums: { 'a.ts': 'md5:abc' },
  }

  await writeTree(root, { [CORE_FILE]: JSON.stringify(core) })
  await assert.rejects(readCore(root), /"checksums\.a\.ts" is missing or invalid/)

  await writeTree(root, { [CORE_FILE]: JSON.stringify({ ...core, schemaVersion: 2 }) })
  await assert.rejects(readCore(root), /schema version 2/)
})

test('a manifest whose checksums name a path outside the project is refused', async () => {
  const root = await tempDir()
  const core = {
    schemaVersion: 1,
    repository: 'github:a/b',
    version: '0.1.0',
    core: [],
    userOwned: [],
    checksums: { '../outside.ts': sha256('x') },
  }

  await writeTree(root, { [CORE_FILE]: JSON.stringify(core) })

  await assert.rejects(readCore(root), /Unsafe path: "\.\.\/outside\.ts"/)
})

test('a path that leaves the project is refused', async () => {
  for (const path of ['../x', 'a/../../x', '/etc/passwd', 'a\\b', 'C:/x', '', 'a//b', './a']) {
    assert.throws(() => assertRelative(path), /Unsafe path/, path)
  }

  assert.equal(assertRelative('apps/web/src/main.tsx'), 'apps/web/src/main.tsx')
})

test('a path through a symbolic link is refused', async () => {
  const root = await tempDir()
  const outside = await tempDir()

  await mkdir(join(root, 'apps'), { recursive: true })
  await symlink(outside, join(root, 'apps/web'))

  await assert.rejects(assertSafePath(root, 'apps/web/src/main.tsx'), /symbolic link/)
  await assert.rejects(
    applyOperations(root, [{ path: 'apps/web/x.ts', content: 'x' }]),
    /symbolic link/
  )
  assert.deepEqual(await readdir(outside), [])
})

test('the writes of a transaction land together, deletions included', async () => {
  const root = await tempDir()

  await writeTree(root, { 'a.txt': 'old', 'gone/b.txt': 'b' })

  await applyOperations(root, [
    { path: 'a.txt', content: 'new' },
    { path: 'deep/c.txt', content: 'c' },
    { path: 'gone/b.txt', delete: true },
  ])

  assert.equal(await read(root, 'a.txt'), 'new')
  assert.equal(await read(root, 'deep/c.txt'), 'c')
  assert.deepEqual((await readdir(root)).sort(), ['a.txt', 'deep'])
})

test('a failure while staging leaves every original file and no temporary one', async () => {
  const root = await tempDir()

  await writeTree(root, { 'a.txt': 'a', 'b.txt': 'b' })

  const before = await snapshot(root)
  let writes = 0

  await assert.rejects(
    applyOperations(
      root,
      [
        { path: 'a.txt', content: 'A' },
        { path: 'new/c.txt', content: 'C' },
        { path: 'b.txt', content: 'B' },
      ],
      {
        write: async (path, content) => {
          if (++writes === 3) throw new Error('disk full')
          await writeFile(path, content)
        },
      }
    ),
    /disk full/
  )

  assert.deepEqual(await snapshot(root), before)
  assert.deepEqual((await readdir(root)).sort(), ['a.txt', 'b.txt'])
})

test('the metadata is written with sorted checksums', () => {
  const text = serializeMetadata({ checksums: { 'b.ts': 'sha256:2', 'a.ts': 'sha256:1' } })

  assert.ok(text.indexOf('a.ts') < text.indexOf('b.ts'))
  assert.ok(text.endsWith('}\n'))
})

test('the project root is the closest directory with the metadata or the workspaces', async () => {
  const project = await generateProject()

  await mkdir(join(project, 'apps/web/src/lib'), { recursive: true })
  assert.equal(await findProjectRoot(join(project, 'apps/web/src/lib')), project)

  const checkout = await tempDir()

  await writeTree(checkout, {
    'package.json': '{ "workspaces": ["apps/*"] }',
    'apps/web/package.json': '{ "name": "web" }',
  })
  assert.equal(await findProjectRoot(join(checkout, 'apps/web')), checkout)
})
