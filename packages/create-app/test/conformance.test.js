import assert from 'node:assert/strict'
import test from 'node:test'
import { cp, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { run } from '../src/index.js'
import { listFiles } from '../src/files.js'
import { isExcluded } from '../src/glob.js'
import { materialize } from '../../core-tools/src/transform.js'
import { createTemplate, manifest } from './fixture.js'

/**
 * The files only the installer writes. Its env step creates the env files and
 * completes their examples; they belong to the product, so an update never
 * writes them. The metadata is the record the updater reads.
 */
const INSTALLER_ONLY = ['.env*', '**/.env*', '.dash/**']

/**
 * The installer and the core update transform the template on their own, in
 * two packages that cannot import each other. Both run here on the same
 * template, and the update must rebuild the installed project byte for byte,
 * so the two can never drift silently.
 */
for (const flags of [
  ['--name', 'Acme AI', '--slug', 'acme-ai', '--email', 'hi@acme.test'],
  ['--name', 'Beta Labs', '--slug', 'beta-labs', '--locale', 'es', '--palette', 'forest'],
]) {
  test(`the update materializes the template as the installer did (${flags[1]})`, async () => {
    const template = await createTemplate()
    const workspace = await mkdtemp(join(tmpdir(), 'create-app-conformance-'))
    const installed = join(workspace, 'installed')
    const release = join(workspace, 'release')

    const code = await run(
      [
        installed,
        '--template',
        template,
        ...flags,
        '--yes',
        '--no-install',
        '--no-boot',
        '--no-git',
      ],
      {
        manifest,
        version: '0.1.0',
        log: () => {},
        run: async () => ({ code: 0, output: '', error: null }),
      }
    )

    assert.equal(code, 0)

    const install = JSON.parse(await readFile(join(installed, '.dash/install.json'), 'utf8'))

    await cp(template, release, { recursive: true })
    const { conflicts } = await materialize(release, install)

    assert.equal(conflicts.size, 0)

    const expected = (await listFiles(installed)).filter(
      (file) => !isExcluded(file, INSTALLER_ONLY)
    )
    const actual = (await listFiles(release)).filter((file) => !isExcluded(file, INSTALLER_ONLY))

    assert.deepEqual(actual.sort(), expected.sort())

    for (const file of expected) {
      assert.equal(
        await readFile(join(release, file), 'utf8'),
        await readFile(join(installed, file), 'utf8'),
        file
      )
    }
  })
}
