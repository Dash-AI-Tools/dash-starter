import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { run } from './checks.mjs'
import { addWorktree, envLines, removeWorktree, slotPorts, worktreePath } from './worktree.mjs'

async function gitRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-worktree-'))
  await run('git', ['init', '-q', '-b', 'main', '.'], dir)
  writeFileSync(join(dir, 'README.md'), '# repo\n')
  await run('git', ['add', 'README.md'], dir)
  await run('git', ['-c', 'user.email=a@b.c', '-c', 'user.name=t', 'commit', '-qm', 'init'], dir)
  return dir
}

test('the slot takes the base port plus ten times the slot', () => {
  const one = slotPorts(1)
  assert.equal(one.dev.db, 5443)
  assert.equal(one.dev.web, 5183)
  assert.equal(one.e2e.db, 5444)
  assert.equal(one.e2e.web, 5184)

  const two = slotPorts(2)
  assert.equal(two.dev.web, 5193)
  assert.equal(two.e2e.web, 5194)
})

test('the env of the worktree names its projects and its ports', () => {
  const lines = envLines('add-invoices', 1)
  assert.match(lines, /DEV_COMPOSE_PROJECT_NAME=dash-wt1/)
  assert.match(lines, /DB_HOST_PORT=5443/)
  assert.match(lines, /WEB_HOST_PORT=5183/)
  assert.match(lines, /E2E_COMPOSE_PROJECT_NAME=dash-e2e-wt1/)
  assert.match(lines, /E2E_DB_HOST_PORT=5444/)
  assert.match(lines, /E2E_WEB_URL=http:\/\/localhost:5184/)
  assert.match(lines, /E2E_MAILPIT_URL=http:\/\/localhost:8036/)
})

test('a worktree is a checkout with its own branch, env files and ports', async () => {
  const root = await gitRepo()
  writeFileSync(join(root, '.env'), 'APP_KEY=secret\n')
  mkdirSync(join(root, 'apps/api'), { recursive: true })
  writeFileSync(
    join(root, 'apps/api/.env'),
    'PORT=3333\nDB_PORT=5433\nSMTP_PORT=1025\nWEB_URL=http://localhost:5173\n'
  )

  const result = await addWorktree({ root, changeId: 'add-invoices', slot: 1 })
  const path = worktreePath(root, 'add-invoices')
  assert.equal(result.path, path)
  assert.ok(existsSync(path))
  assert.equal(result.branch, 'feat/add-invoices')

  const branch = await run('git', ['branch', '--list', 'feat/add-invoices'], root)
  assert.match(branch.output, /feat\/add-invoices/)

  // The env files of the developer are copied and the ports of the slot are
  // appended to the root `.env` of the worktree.
  const env = readFileSync(join(path, '.env'), 'utf8')
  assert.match(env, /APP_KEY=secret/)
  assert.match(env, /DEV_COMPOSE_PROJECT_NAME=dash-wt1/)
  assert.match(env, /DB_HOST_PORT=5443/)

  const apiEnv = readFileSync(join(path, 'apps/api/.env'), 'utf8')
  assert.match(apiEnv, /PORT=3343/)
  assert.match(apiEnv, /DB_PORT=5443/)
  assert.match(apiEnv, /SMTP_PORT=1035/)
  assert.match(apiEnv, /WEB_URL=http:\/\/localhost:5183/)

  await removeWorktree({ root, changeId: 'add-invoices', slot: 1 })
  assert.equal(existsSync(path), false)
  const after = await run('git', ['branch', '--list', 'feat/add-invoices'], root)
  assert.equal(after.output.trim(), '')
})

test('the slot has to be a number of one or more', async () => {
  const root = await gitRepo()
  await assert.rejects(() => addWorktree({ root, changeId: 'x', slot: 0 }), /slot/)
  await assert.rejects(() => addWorktree({ root, changeId: 'x', slot: 'one' }), /slot/)
})

test('the change id has to be a name, never a path', async () => {
  const root = await gitRepo()
  for (const changeId of ['../..', '/tmp', 'Add Invoices', 'add invoices', 'add\ninvoices', '']) {
    await assert.rejects(
      () => addWorktree({ root, changeId, slot: 1 }),
      /change id/,
      `add accepted "${changeId}"`
    )
    await assert.rejects(
      () => removeWorktree({ root, changeId, slot: 1 }),
      /change id/,
      `remove accepted "${changeId}"`
    )
  }
  assert.equal(existsSync(join(root, '.claude', 'worktrees')), false)
})
