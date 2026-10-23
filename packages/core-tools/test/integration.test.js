import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, readFile, readdir, symlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

import { main } from '../src/cli.js'
import { exists } from '../src/files.js'
import { logger, tempDir } from './helpers.js'

const run = promisify(execFile)

/**
 * The checkout the tools live in: the template, or a generated project.
 */
const project = resolve(import.meta.dirname, '../../..')

/**
 * The directories a copy of the project leaves out; the dependencies are
 * linked instead, so the test runs without the network.
 */
const SKIPPED = new Set(['node_modules', '.git', 'dist', 'build', 'tmp', '.vitest'])

/**
 * Copies the project to a temporary directory and links every installed
 * `node_modules` of the original into the copy.
 */
async function copyProject() {
  const root = await tempDir('core-integration-')

  await cp(project, root, {
    recursive: true,
    filter: (source) => !SKIPPED.has(source.split('/').at(-1)),
  })

  for (const dir of ['.', 'apps/api', 'apps/web', 'packages/ui']) {
    const modules = join(project, dir, 'node_modules')
    if (await exists(modules)) await symlink(modules, join(root, dir, 'node_modules'))
  }

  return root
}

/**
 * The generators write a feature and a component that the rest of the
 * project picks up on its own: the API codegen puts the endpoint in the typed
 * client, and the component is exported from the custom entry of the kit.
 */
test(
  'a generated feature reaches the typed client and a component the custom entry',
  { skip: !(await exists(join(project, 'node_modules/@adonisjs/core'))) },
  async () => {
    const root = await copyProject()
    const log = logger()

    assert.equal(
      await main(['make:feature', 'invoices'], { cwd: root, log, error: log }),
      0,
      log.text()
    )
    assert.equal(
      await main(['make:component', 'data-card'], { cwd: root, log, error: log }),
      0,
      log.text()
    )

    await run('node', ['ace', 'codegen'], { cwd: join(root, 'apps/api') })

    const registry = await readFile(
      join(root, 'apps/api/.adonisjs/client/registry/index.ts'),
      'utf8'
    )

    assert.match(registry, /pattern: '\/api\/v1\/orgs\/:orgSlug\/invoices'/)

    const custom = await readFile(join(root, 'packages/ui/src/custom/index.ts'), 'utf8')
    const ui = JSON.parse(await readFile(join(root, 'packages/ui/package.json'), 'utf8'))

    assert.match(custom, /^export \{ DataCard, type DataCardProps \} from '\.\/data-card'$/m)
    assert.ok(ui.exports['./custom'], 'the kit exports its custom entry')
    assert.ok(
      (await readdir(join(root, 'packages/ui/src/custom'))).includes('data-card.stories.tsx')
    )
    const original = await readFile(join(project, 'packages/ui/src/custom/index.ts'), 'utf8')

    assert.equal(original.includes('data-card'), false, 'the original project is untouched')
  }
)
