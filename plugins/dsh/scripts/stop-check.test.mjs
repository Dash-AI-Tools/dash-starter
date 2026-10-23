import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { check, failureReason, parsePorcelain } from './stop-check.mjs'

// A repository with one workspace whose typecheck does what the script says.
function workspaceRepo(script) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-stop-'))
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'root', private: true, workspaces: ['apps/api'] })
  )
  mkdirSync(join(root, 'apps/api'), { recursive: true })
  writeFileSync(
    join(root, 'apps/api/package.json'),
    JSON.stringify({ name: '@dash/api', version: '0.0.0', scripts: { typecheck: script } })
  )
  return root
}

test('the status of git is read as a list of paths', () => {
  assert.deepEqual(parsePorcelain(' M apps/api/app/services/x.ts\n'), [
    'apps/api/app/services/x.ts',
  ])
  assert.deepEqual(parsePorcelain('?? docs/new.md\n'), ['docs/new.md'])
  assert.deepEqual(parsePorcelain('A  apps/web/src/pages/X.tsx\n'), ['apps/web/src/pages/X.tsx'])
  assert.deepEqual(parsePorcelain('R  old.ts -> new.ts\n'), ['new.ts'])
  assert.deepEqual(parsePorcelain(''), [])
})

test('a session that changed nothing is not checked', async () => {
  const result = await check({ files: [] })
  assert.equal(result.skipped, 'no changes')
  assert.equal(result.ok, true)
})

test('a session that changed a document is not checked', async () => {
  const result = await check({ files: ['docs/architecture.md'] })
  assert.equal(result.skipped, 'no workspace affected')
  assert.equal(result.ok, true)
})

test('a broken type keeps the session open', async () => {
  const root = workspaceRepo('node -e "console.error(\'type error in x.ts\');process.exit(1)"')
  const result = await check({ root, files: ['apps/api/app/models/x.ts'] })
  assert.equal(result.ok, false)
  assert.equal(result.results[0].check, 'typecheck')
  assert.match(result.results[0].output, /type error in x\.ts/)
})

test('a workspace that passes its typecheck lets the session end', async () => {
  const root = workspaceRepo('node -e "process.exit(0)"')
  const result = await check({ root, files: ['apps/api/app/models/x.ts'] })
  assert.equal(result.ok, true)
  assert.equal(result.results[0].check, 'typecheck')
})

test('the failure names each failing check with the end of its output', () => {
  const output = Array.from({ length: 30 }, (_, index) => `line ${index}`).join('\n')
  const reason = failureReason({
    results: [
      { workspace: 'apps/web', check: 'typecheck', ok: false, output },
      { workspace: 'apps/api', check: 'typecheck', ok: true, output: 'fine' },
    ],
  })
  assert.match(reason, /^The changed workspaces do not pass their checks\./)
  assert.match(reason, /### apps\/web: typecheck\nline 10\n[\s\S]*line 29$/)
  assert.doesNotMatch(reason, /apps\/api|line 9\n/)
})
