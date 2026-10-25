import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  affectedWorkspaces,
  checkStaged,
  isSecretPath,
  isolatedEnv,
  lintedWorkspaceOf,
  repoRoot,
  run,
} from './checks.mjs'

test('the changed paths map to the workspaces that own them', () => {
  assert.deepEqual(affectedWorkspaces(['apps/api/app/services/x.ts']), ['apps/api'])
  assert.deepEqual(affectedWorkspaces(['apps/web/src/pages/X.tsx']), ['apps/web'])
  assert.deepEqual(affectedWorkspaces(['e2e/specs/auth.spec.ts']), ['e2e'])
  assert.deepEqual(affectedWorkspaces(['packages/create-app/src/env.js']), ['packages/create-app'])
  assert.deepEqual(affectedWorkspaces(['plugins/dsh/scripts/checks.mjs']), ['plugins/dsh'])
})

test('a workspace without a linter is never linted', () => {
  assert.equal(lintedWorkspaceOf('apps/api/app/services/x.ts'), 'apps/api')
  assert.equal(lintedWorkspaceOf('packages/create-app/src/env.js'), 'packages/create-app')
  assert.equal(lintedWorkspaceOf('plugins/dsh/scripts/checks.mjs'), null)
  assert.equal(lintedWorkspaceOf('docs/architecture.md'), null)
})

test('a document or a plan touches no workspace', () => {
  assert.deepEqual(affectedWorkspaces(['docs/architecture.md']), [])
  assert.deepEqual(affectedWorkspaces(['openspec/changes/add-dev-harness/tasks.md']), [])
  assert.deepEqual(affectedWorkspaces(['README.md']), [])
})

test('a root file that every workspace depends on touches them all', () => {
  const workspaces = affectedWorkspaces(['package.json'])
  assert.ok(workspaces.includes('apps/api'))
  assert.ok(workspaces.includes('apps/web'))
  assert.ok(workspaces.length >= 4)
})

test('a root file leaves out a workspace the checkout does not have', () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-root-'))
  for (const dir of ['apps/api', 'apps/web', 'e2e', 'plugins/dsh']) {
    mkdirSync(join(root, dir), { recursive: true })
    writeFileSync(join(root, dir, 'package.json'), '{}')
  }

  const workspaces = affectedWorkspaces(['package-lock.json'], root)

  assert.deepEqual(workspaces, ['apps/api', 'apps/web', 'e2e', 'plugins/dsh'])
})

test('the secret patterns refuse the env files, the keys and the lockfile', () => {
  assert.equal(isSecretPath('.env'), true)
  assert.equal(isSecretPath('apps/api/.env'), true)
  assert.equal(isSecretPath('apps/api/.env.local'), true)
  assert.equal(isSecretPath('apps/api/.env.docker'), true)
  assert.equal(isSecretPath('apps/api/.env.example'), false)
  assert.equal(isSecretPath('cert.pem'), true)
  assert.equal(isSecretPath('apps/api/server.key'), true)
  assert.equal(isSecretPath('package-lock.json'), true)
  assert.equal(isSecretPath('apps/api/app/services/x.ts'), false)
  assert.equal(isSecretPath('docs/architecture.md'), false)
})

async function gitRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-git-'))
  await run('git', ['init', '-q', '.'], dir)
  return dir
}

test('a secret that is only staged is refused', async () => {
  const dir = await gitRepo()
  mkdirSync(join(dir, 'apps/api'), { recursive: true })
  writeFileSync(join(dir, 'apps/api/.env'), 'SECRET=1\n')
  await run('git', ['add', '-f', 'apps/api/.env'], dir)

  const result = await checkStaged({ root: dir })
  assert.deepEqual(result.secrets, ['apps/api/.env'])
  assert.equal(result.ok, false)
})

test('a secret that is already in HEAD is not refused again', async () => {
  const dir = await gitRepo()
  writeFileSync(join(dir, '.env'), 'SECRET=1\n')
  await run('git', ['add', '-f', '.env'], dir)
  await run('git', ['-c', 'user.email=a@b.c', '-c', 'user.name=t', 'commit', '-qm', 'init'], dir)
  await run('git', ['rm', '--cached', '-q', '.env'], dir)
  await run('git', ['add', '-f', '.env'], dir)

  const result = await checkStaged({ root: dir })
  assert.deepEqual(result.secrets, [])
  assert.equal(result.ok, true)
})

test('a normal staged file is not a secret', async () => {
  const dir = await gitRepo()
  writeFileSync(join(dir, 'readme.md'), '# hello\n')
  await run('git', ['add', 'readme.md'], dir)

  const result = await checkStaged({ root: dir })
  assert.deepEqual(result.secrets, [])
  assert.deepEqual(result.staged, ['readme.md'])
})

test('a staged file that the formatter would change is refused', async () => {
  const dir = await gitRepo()
  // The formatter of the repository, borrowed by the temporary checkout.
  symlinkSync(join(repoRoot(), 'node_modules'), join(dir, 'node_modules'))
  writeFileSync(join(dir, 'x.ts'), "const a = 'x'\n")
  await run('git', ['add', 'x.ts'], dir)

  const result = await checkStaged({ root: dir })
  const format = result.style.results.find((entry) => entry.check === 'format')
  assert.ok(format, 'the formatter did not run')
  assert.equal(format.ok, false)
  assert.equal(result.ok, false)
})

test('the checks never inherit the variables that git sets for a hook', () => {
  const env = isolatedEnv({ GIT_DIR: '.git', GIT_INDEX_FILE: '.git/index', PATH: '/usr/bin' })
  assert.deepEqual(env, { PATH: '/usr/bin' })
})
