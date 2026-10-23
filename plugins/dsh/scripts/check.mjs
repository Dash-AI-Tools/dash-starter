// `check [--changed | <workspace>...]`: format, lint, typecheck and test the
// workspaces a change touched, one line per step, and for a failed step only
// the lines that name the failure. An agent reads what broke, not the reporter.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  WORKSPACES,
  affectedWorkspaces,
  isFormattable,
  isolatedEnv,
  repoRoot,
  run,
  runChecks,
} from './checks.mjs'
import { changedPaths } from './stop-check.mjs'

export const LIMIT = 30

const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g

// The markers after which a reporter repeats its failures in full. The lines
// before them hold the same failures inline, among the passing tests.
const SECTIONS = [
  /^✖ failing tests:/, // node:test, spec reporter
  /^\s*ERRORS\s*$/, // Japa
  /⎯ Failed Tests \d+ ⎯/, // Vitest
]

// The first line of a failure: the lines after it explain it.
const HEADERS = [
  /^\s*✖ (?!failing tests:)/, // node:test spec, Japa spec
  /^\s*❯ /, // Japa
  /^\s*FAIL\s/, // Vitest
  /^\s*not ok \d+/, // node:test TAP
]

// Where the explanation of a failure ends: stack frames and code frames.
const ENDS = [/^\s*(?:⁃ )?at /, /^\s*stack: \|/, /^\s*⎯/, /^\[\d+\/\d+\]/, /^\s*\.\.\.\s*$/]

// The lines of a TAP block that say nothing about the failure.
const TAP_NOISE = /^\s+(?:---|duration_ms:|type:|location:|failureType:|code:|name:|operator:)/

// Lines kept wherever they appear.
const SUMMARY = [
  /^\[warn\] /, // Prettier
  /^\s*Tests?\s{1,}\d+ (?:passed|failed)/, // Japa
  /^\s*Tests\s+\d+ failed/, // Vitest
  /^\s*Test Files\s+\d+ failed/, // Vitest
  /^ℹ fail [1-9]/, // node:test spec
  /^# fail [1-9]/, // node:test TAP
  /^test at /, // node:test spec: where the failing test is
]

const CODE_FRAME = /^\s*(?:❯|>)?\s*\d+\s*[┃|]/
const NPM = /^npm (?:error|ERR!|warn)/
const ESLINT_SUMMARY = /^✖ \d+ problems? \(/
const ESLINT_FILE = /^(?:\/|[A-Za-z]:\\|\.{0,2}\/?[\w@.-]+\/)\S*\.\w+$/
const ESLINT_ERROR = /^\s+\d+:\d+\s+error\s/
const TS_ERROR = /error TS\d+:/

const clip = (line) => (line.length > 200 ? line.slice(0, 199) + '…' : line)

// The failure lines of a step's output, at most `limit` of them. When nothing
// matches, the tail of the output stands in, so a failure is never silent.
export function trimFailure(output, { limit = LIMIT } = {}) {
  const lines = output.replace(ANSI, '').replace(/\r/g, '').split('\n')
  const sectioned = lines.some((line) => SECTIONS.some((marker) => marker.test(line)))
  let inSection = !sectioned
  let block = null // 'test', 'tap' or 'ts' while inside the explanation of a failure
  let eslintFile = null
  const kept = []

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (SECTIONS.some((marker) => marker.test(line))) {
      inSection = true
      block = null
      continue
    }

    if (block === 'ts') {
      if (/^\s+\S/.test(line)) {
        kept.push(line)
        continue
      }
      block = null
    }

    if (TS_ERROR.test(line)) {
      kept.push(line)
      block = 'ts'
      continue
    }

    if (ESLINT_FILE.test(line)) {
      eslintFile = line
      continue
    }
    if (ESLINT_ERROR.test(line)) {
      if (eslintFile) kept.push(eslintFile)
      eslintFile = null
      kept.push(line)
      continue
    }

    // A code frame (`❯ 5 ┃ …`, `> 15| …`) or npm's own epilogue explains nothing.
    if (CODE_FRAME.test(line) || NPM.test(line)) {
      if (block) block = null
      continue
    }
    if (ESLINT_SUMMARY.test(line)) {
      kept.push(line)
      continue
    }

    if (inSection && HEADERS.some((header) => header.test(line))) {
      // In Vitest a `❯` inside a failure is its location: it ends the failure.
      if (block === 'test' && /^\s*❯ /.test(line)) {
        kept.push(line)
        block = null
        continue
      }
      kept.push(line)
      block = /not ok \d+/.test(line) ? 'tap' : 'test'
      continue
    }

    if (block) {
      if (ENDS.some((end) => end.test(line))) {
        block = null
        continue
      }
      if (!line.trim() || (block === 'tap' && TAP_NOISE.test(line))) continue
      kept.push(line)
      continue
    }

    if (SUMMARY.some((summary) => summary.test(line))) kept.push(line)
  }

  const found = kept.length
    ? kept
    : lines.filter((line) => line.trim() && !NPM.test(line)).slice(-10)
  const shown = found.slice(0, limit).map(clip)
  if (found.length > limit) shown.push(`… ${found.length - limit} more`)
  return shown
}

export function findWorkspace(name) {
  const key = name.replace(/\/$/, '')
  return WORKSPACES.find((w) => w.dir === key || w.name === key || w.dir.split('/').pop() === key)
}

const PRETTIER = ['node_modules', 'prettier', 'bin', 'prettier.cjs']

// The steps of one run, in order: what to run and how to rerun it untrimmed.
export function planSteps({ changed, workspaces, files }) {
  const steps = []
  if (changed) {
    // A changed folder (an untracked one) is expanded by Prettier itself.
    const targets = files.filter((file) => file.endsWith('/') || isFormattable(file))
    if (targets.length) steps.push({ step: 'format', workspace: 'changed', targets })
  }
  for (const workspace of workspaces) {
    if (!changed) steps.push({ step: 'format', workspace: workspace.dir, targets: [workspace.dir] })
    if (workspace.lint) steps.push({ step: 'lint', workspace: workspace.dir, npm: workspace })
    steps.push({ step: 'checks', workspace: workspace.dir })
    // A named workspace runs its whole suite, the API included: its tests need
    // Postgres, so a run of the changed files leaves them to CI.
    if (!changed && (workspace.test === 'vitest' || workspace.dir === 'apps/api')) {
      steps.push({ step: 'test', workspace: workspace.dir, npm: workspace })
    }
  }
  return steps
}

// The files Prettier would change, so the command to rerun stays short.
export function warnedFiles(output, fallback) {
  const files = output
    .replace(ANSI, '')
    .split('\n')
    .map((line) => line.match(/^\[warn\] (\S+)$/)?.[1])
    .filter(Boolean)
  return files.length ? files : fallback
}

function rerunOf(result, files) {
  const workspace = WORKSPACES.find((w) => w.dir === result.workspace)
  if (result.check === 'typecheck') return `npm run typecheck -w ${workspace.name}`
  if (workspace.test === 'vitest') {
    const prefix = `${workspace.dir}/`
    const related = files.filter((f) => f.startsWith(prefix)).map((f) => f.slice(prefix.length))
    return `cd ${workspace.dir} && npx vitest related --run ${related.join(' ')}`
  }
  return `npm test -w ${workspace.name}`
}

export async function check(
  argv,
  { root = repoRoot(), runner = run, checks = runChecks, changes = changedPaths, env } = {}
) {
  const names = argv.filter((arg) => arg !== '--changed')
  const changed = names.length === 0
  let files = []
  let workspaces
  if (changed) {
    files = (await changes(root)).filter(
      (file) => file.endsWith('/') || existsSync(join(root, file))
    )
    if (files.length === 0) return { code: 0, out: 'nothing changed' }
    workspaces = affectedWorkspaces(files).map(findWorkspace)
  } else {
    workspaces = names.map(findWorkspace)
    const unknown = names.filter((name, index) => !workspaces[index])
    if (unknown.length) {
      const known = WORKSPACES.map((w) => w.dir).join(', ')
      return { code: 1, out: `Unknown workspace: ${unknown.join(', ')}. Known: ${known}` }
    }
  }

  const environment = env ?? isolatedEnv()
  const results = []
  for (const step of planSteps({ changed, workspaces, files })) {
    if (step.step === 'format') {
      const prettier = join(root, ...PRETTIER)
      const args = ['--check', '--ignore-unknown', '--no-error-on-unmatched-pattern']
      const result = await runner(
        'node',
        [prettier, ...args, '--', ...step.targets],
        root,
        environment
      )
      results.push({
        ...step,
        ok: result.code === 0,
        output: result.output,
        rerun: `npx prettier --check ${warnedFiles(result.output, step.targets).join(' ')}`,
      })
    } else if (step.step === 'lint' || step.step === 'test') {
      const script = step.step === 'lint' ? ['run', 'lint'] : ['test']
      const result = await runner('npm', [...script, '-w', step.npm.name], root, environment)
      results.push({
        ...step,
        ok: result.code === 0,
        output: result.output,
        rerun: `npm ${script.join(' ')} -w ${step.npm.name}`,
      })
    } else {
      const outcome = await checks([step.workspace], { files, root })
      for (const result of outcome.results) {
        results.push({
          step: result.check,
          workspace: result.workspace,
          ok: result.ok,
          output: result.output,
          rerun: rerunOf(result, files),
        })
      }
    }
  }

  const lines = []
  for (const result of results) {
    lines.push(`${result.step} ${result.workspace} ${result.ok ? 'ok' : 'failed'}`)
    if (result.ok) continue
    for (const line of trimFailure(result.output)) lines.push(`  ${line}`)
    lines.push(`  rerun: ${result.rerun}`)
  }
  if (results.length === 0) lines.push('no step to run: the changes touch no workspace')
  return { code: results.every((result) => result.ok) ? 0 : 1, out: lines.join('\n') }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await check(process.argv.slice(2))
  process.stdout.write(result.out + '\n')
  process.exit(result.code)
}
