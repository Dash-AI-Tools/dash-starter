import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { LIMIT, check, planSteps, trimFailure, findWorkspace } from './check.mjs'

// Outputs recorded from real runs of each tool, with the paths rewritten.
const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'check')
const fixture = (name) => readFileSync(join(fixtures, `${name}.txt`), 'utf8')

test('TypeScript keeps its errors', () => {
  assert.deepEqual(trimFailure(fixture('typescript')), [
    "src/invoices.ts(2,14): error TS2322: Type 'string' is not assignable to type 'number'.",
    "src/invoices.ts(4,58): error TS2551: Property 'amout' does not exist on type 'Invoice'. Did you mean 'amount'?",
    "src/invoices.ts(6,42): error TS2322: Type 'string' is not assignable to type 'number'.",
  ])
})

test('TypeScript keeps the elaboration of an error', () => {
  const output = [
    "src/a.ts(1,7): error TS2322: Type '{ id: string; }' is not assignable to type 'Invoice'.",
    "  Types of property 'id' are incompatible.",
    "    Type 'string' is not assignable to type 'number'.",
    'npm error command failed',
  ].join('\n')
  assert.equal(trimFailure(output).length, 3)
})

test('ESLint keeps the errors with their file, not the warnings or npm', () => {
  assert.deepEqual(trimFailure(fixture('eslint')), [
    '/repo/apps/web/src/dsh-probe.test.ts',
    "  5:7  error  'unused' is assigned a value but never used  @typescript-eslint/no-unused-vars",
    '✖ 2 problems (1 error, 1 warning)',
  ])
})

test('Prettier keeps the files it would change', () => {
  assert.deepEqual(trimFailure(fixture('prettier')), [
    '[warn] invoices.ts',
    '[warn] catalog.json',
    '[warn] Code style issues found in 2 files. Run Prettier with --write to fix.',
  ])
})

test('Vitest keeps the failing test, its assertion and its location', () => {
  const lines = trimFailure(fixture('vitest'))
  assert.equal(
    lines[0],
    ' FAIL  src/dsh-probe.test.ts > billing catalog > names the invoices title'
  )
  assert.ok(lines.includes('+   "title": "Invoices",'))
  assert.ok(lines.includes(' ❯ src/dsh-probe.test.ts:15:46'))
  assert.ok(lines.some((line) => line.startsWith('AssertionError: expected')))
  assert.ok(!lines.some((line) => /\d+\|/.test(line)), 'the code frame')
  assert.ok(!lines.some((line) => line.includes('Duration')))
})

for (const reporter of ['japa-dot', 'japa-spec']) {
  test(`Japa (${reporter}) keeps the failing tests and their assertions once`, () => {
    const lines = trimFailure(fixture(reporter))
    const titles = lines.filter((line) => line.startsWith('❯ '))
    assert.deepEqual(titles, [
      '❯ Invoices / a failed payment records a failed invoice',
      '❯ Plans / the free plan has no invoices',
    ])
    assert.ok(lines.includes('ℹ AssertionError: expected 2 to equal +0'))
    assert.ok(lines.includes('+   "state": "paid",'))
    assert.ok(!lines.some((line) => /✔|⁃ at|┃|\x1b/.test(line)))
    assert.equal(lines.at(-1), 'Tests  200 passed, 2 failed (202)')
  })
}

test('node:test (TAP) keeps not ok, the error, expected and actual', () => {
  const lines = trimFailure(fixture('node-test-tap'))
  assert.equal(lines[0], 'not ok 151 - the invoices title lands in both catalogs')
  assert.ok(lines.includes('  expected:'))
  assert.ok(lines.includes("    es: 'Facturas'"))
  assert.ok(!lines.some((line) => /^ok |duration_ms|location:|Test\.run/.test(line)))
  assert.equal(lines.at(-1), '# fail 1')
})

test('a long failure is capped with the number of hidden lines', () => {
  const output = Array.from(
    { length: 100 },
    (_, index) => `src/a.ts(${index + 1},1): error TS2304: Cannot find name 'x'.`
  ).join('\n')
  const lines = trimFailure(output)
  assert.equal(lines.length, LIMIT + 1)
  assert.equal(lines.at(-1), `… ${100 - LIMIT} more`)
})

test('an output with no known failure line falls back to its tail', () => {
  const lines = trimFailure('> x\nsomething broke\nnpm error code 1\n')
  assert.deepEqual(lines, ['> x', 'something broke'])
})

// A project with one changed file, and fake runners that record every step.
function setup({ files = ['apps/web/src/pages/X.tsx'], failing = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-check-'))
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), 'x\n')
  }
  const calls = []
  const runner = async (command, args) => {
    const line = `${command} ${args.filter((arg) => !arg.includes('prettier.cjs')).join(' ')}`
    calls.push(line)
    const failure = Object.entries(failing).find(([key]) => line.includes(key))
    return failure ? { code: 1, output: failure[1] } : { code: 0, output: 'all good\n' }
  }
  const checks = async ([dir]) => {
    const workspace = findWorkspace(dir)
    const results = []
    if (workspace.typecheck)
      results.push({ workspace: dir, check: 'typecheck', ok: true, output: '' })
    if (workspace.test === 'node' || workspace.test === 'vitest') {
      const output = failing[`test ${dir}`]
      results.push({ workspace: dir, check: 'test', ok: !output, output: output || '✔ ok\n' })
    }
    calls.push(`checks ${dir}`)
    return { ok: results.every((result) => result.ok), results }
  }
  const options = { root, runner, checks, changes: async () => files, env: {} }
  return { calls, options }
}

test('A passing run prints one line per step', async () => {
  const { calls, options } = setup()
  const result = await check(['--changed'], options)
  assert.equal(result.code, 0)
  assert.deepEqual(result.out.split('\n'), [
    'format changed ok',
    'lint apps/web ok',
    'typecheck apps/web ok',
    'test apps/web ok',
  ])
  assert.deepEqual(calls, [
    'node --check --ignore-unknown --no-error-on-unmatched-pattern -- apps/web/src/pages/X.tsx',
    'npm run lint -w @dash/web',
    'checks apps/web',
  ])
})

test('A failure prints only what failed', async () => {
  const { options } = setup({
    files: ['plugins/dsh/scripts/i18n.mjs'],
    failing: { 'test plugins/dsh': fixture('node-test-spec') },
  })
  const result = await check([], options)
  assert.equal(result.code, 1)
  const lines = result.out.split('\n')
  assert.equal(lines[0], 'format changed ok')
  assert.equal(lines[1], 'test plugins/dsh failed')
  assert.ok(lines.some((line) => line.includes('✖ the invoices title lands in both catalogs')))
  assert.ok(lines.some((line) => line.includes('AssertionError')))
  assert.ok(lines.some((line) => line.includes("-   es: 'Facturas'")))
  assert.ok(!lines.some((line) => line.includes('✔')), 'a passing test')
  assert.ok(lines.length <= LIMIT + 4)
  assert.equal(lines.at(-1), '  rerun: npm test -w @dash/dsh')
})

test('a failed format and lint name the files and the command to rerun', async () => {
  const { options } = setup({
    failing: { '--check': fixture('prettier'), 'run lint': fixture('eslint') },
  })
  const result = await check(['--changed'], options)
  assert.equal(result.code, 1)
  assert.match(result.out, /^format changed failed\n {2}\[warn\] invoices\.ts/)
  assert.match(result.out, /rerun: npx prettier --check invoices\.ts catalog\.json\n/)
  assert.match(result.out, /lint apps\/web failed\n.*dsh-probe\.test\.ts\n.*no-unused-vars/)
  assert.match(result.out, /rerun: npm run lint -w @dash\/web/)
})

test('a named API runs its whole suite; a changed API does not', async () => {
  const { calls, options } = setup({ files: ['apps/api/app/services/x.ts'] })
  const named = await check(['apps/api'], options)
  assert.equal(named.code, 0)
  assert.deepEqual(named.out.split('\n'), [
    'format apps/api ok',
    'lint apps/api ok',
    'typecheck apps/api ok',
    'test apps/api ok',
  ])
  assert.ok(calls.includes('npm test -w @dash/api'))

  const changed = planSteps({
    changed: true,
    workspaces: [findWorkspace('apps/api')],
    files: ['apps/api/app/services/x.ts'],
  })
  assert.ok(!changed.some((step) => step.step === 'test'))
})

test('nothing changed and an unknown workspace', async () => {
  const { options } = setup({ files: [] })
  assert.deepEqual(await check(['--changed'], options), { code: 0, out: 'nothing changed' })
  const unknown = await check(['apps/nope'], options)
  assert.equal(unknown.code, 1)
  assert.match(unknown.out, /Unknown workspace: apps\/nope/)
})
