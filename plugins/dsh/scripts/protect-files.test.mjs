import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { bashTargets, blockedRule, evaluate, readAllowances } from './protect-files.mjs'

const root = mkdtempSync(join(tmpdir(), 'dsh-protect-'))

test('an edit of a protected file is refused', () => {
  const cases = [
    ['.env', 'env'],
    ['apps/api/.env', 'env'],
    ['apps/api/.env.local', 'env'],
    ['apps/api/.env.docker', 'env'],
    ['cert.pem', 'key'],
    ['apps/api/server.key', 'key'],
    ['package-lock.json', 'lockfile'],
    ['.claude/dsh-allow', 'allow'],
  ]
  for (const [path, id] of cases) {
    const rule = blockedRule(path)
    assert.ok(rule, path + ' should be protected')
    assert.equal(rule.id, id)
  }
})

test('an example file is not protected', () => {
  assert.equal(blockedRule('apps/api/.env.example'), null)
  assert.equal(blockedRule('.env.example'), null)
})

test('the allowance file releases the env files and the lockfile', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-allow-'))
  mkdirSync(join(dir, '.claude'), { recursive: true })
  writeFileSync(join(dir, '.claude/dsh-allow'), 'env\nlockfile\n')
  const allowances = readAllowances(dir)
  assert.ok(allowances.has('env'))
  assert.ok(allowances.has('lockfile'))
  assert.equal(blockedRule('apps/api/.env', allowances), null)
  assert.equal(blockedRule('package-lock.json', allowances), null)
  // The key files and the allowance file itself are never released.
  assert.ok(blockedRule('cert.pem', allowances))
  assert.ok(blockedRule('.claude/dsh-allow', allowances))
})

test('a write of a protected file is refused', () => {
  const finding = evaluate(
    {
      tool_name: 'Write',
      tool_input: { file_path: join(root, 'apps/api/.env') },
      cwd: root,
    },
    root
  )
  assert.ok(finding)
  assert.equal(finding.rule.id, 'env')
})

test('a write of a normal file is allowed', () => {
  const finding = evaluate(
    {
      tool_name: 'Edit',
      tool_input: { file_path: join(root, 'apps/api/app/services/x.ts') },
      cwd: root,
    },
    root
  )
  assert.equal(finding, null)
})

test('the shell commands that write a protected file are refused', () => {
  assert.ok(bashTargets('echo x > .env').includes('.env'))
  assert.ok(bashTargets('echo x >> apps/api/.env').includes('apps/api/.env'))
  assert.ok(bashTargets('echo x | tee .env').includes('.env'))
  assert.ok(bashTargets('cp other .env').includes('.env'))
  assert.ok(bashTargets('mv other cert.pem').includes('cert.pem'))
  assert.ok(bashTargets('npm install left-pad').includes('package-lock.json'))
  assert.ok(bashTargets('npm i left-pad').includes('package-lock.json'))
  assert.ok(bashTargets('npm uninstall left-pad').includes('package-lock.json'))
  assert.deepEqual(bashTargets('npm run lint'), [])
  assert.deepEqual(bashTargets('echo hello'), [])
})

test('a shell command that writes a protected file is refused', () => {
  const finding = evaluate(
    {
      tool_name: 'Bash',
      tool_input: { command: 'echo SECRET=1 > .env' },
      cwd: root,
    },
    root
  )
  assert.ok(finding)
  assert.equal(finding.rule.id, 'env')
})
