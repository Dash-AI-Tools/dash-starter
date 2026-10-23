import assert from 'node:assert/strict'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { checkFile, failureReason, formatFile, lintFile, owningWorkspace } from './format-lint.mjs'
import { repoRoot } from './checks.mjs'

test('the linted workspaces are the ones with a linter', () => {
  assert.equal(owningWorkspace('apps/api/app/services/x.ts'), 'apps/api')
  assert.equal(owningWorkspace('apps/web/src/pages/X.tsx'), 'apps/web')
  assert.equal(owningWorkspace('e2e/specs/auth.spec.ts'), 'e2e')
  assert.equal(owningWorkspace('packages/create-app/src/env.js'), 'packages/create-app')
})

test('a file outside a workspace has no linter', () => {
  assert.equal(owningWorkspace('docs/architecture.md'), null)
  assert.equal(owningWorkspace('openspec/changes/add-dev-harness/tasks.md'), null)
  assert.equal(owningWorkspace('plugins/dsh/scripts/checks.mjs'), null)
})

test('the formatter rewrites the file it is given', async () => {
  const root = repoRoot()
  const file = join(root, 'plugins/dsh/dsh-format-probe.ts')
  writeFileSync(file, 'export const x   =    1\n')
  try {
    const result = await formatFile('plugins/dsh/dsh-format-probe.ts', root)
    assert.equal(result.ok, true, result.output)
    assert.equal(readFileSync(file, 'utf8'), 'export const x = 1\n')
  } finally {
    rmSync(file, { force: true })
  }
})

test('a file with a lint error is reported', async () => {
  const dir = repoRoot()
  const file = join(dir, 'apps/web/src/lib/dsh-lint-probe.ts')
  writeFileSync(file, 'export function probe() {\n  const unused = 1\n}\n')
  try {
    const result = await lintFile('apps/web/src/lib/dsh-lint-probe.ts', dir)
    assert.equal(result.ok, false)
    assert.match(result.output, /unused/)
  } finally {
    rmSync(file, { force: true })
  }
})

test('a file that does not exist is not checked', async () => {
  const result = await checkFile(join(repoRoot(), 'apps/web/src/lib/does-not-exist.ts'), repoRoot())
  assert.equal(result.ok, true)
})

test('the failure names the step and the file, with the output', () => {
  assert.equal(
    failureReason('apps/web/src/a.ts', { step: 'lint', output: '  error  unused\n' }),
    'The lint of `apps/web/src/a.ts` failed. Fix it and try again.\n\nerror  unused'
  )
})
