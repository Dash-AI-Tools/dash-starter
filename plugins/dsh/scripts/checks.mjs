// Shared implementation of the guardrails: the workspace map, the secret
// patterns and the checks that the stop hook and the pre-commit gate run.
import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

export const WORKSPACES = [
  // The API unit suite needs Postgres, so the API is checked with its typecheck only.
  { dir: 'apps/api', name: '@dash/api', typecheck: true, test: null, lint: true },
  { dir: 'apps/web', name: '@dash/web', typecheck: true, test: 'vitest', lint: true },
  { dir: 'e2e', name: '@dash/e2e', typecheck: true, test: null, lint: true },
  {
    dir: 'packages/create-app',
    name: 'create-dash-starter',
    typecheck: false,
    test: 'node',
    lint: true,
  },
  // The plugin has no linter of its own: its scripts are plain Node.
  { dir: 'plugins/dsh', name: '@dash/dsh', typecheck: false, test: 'node', lint: false },
]

// A root file that every workspace depends on.
const ROOT_AFFECTING = new Set([
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'tsconfig.json',
  'prettier.config.js',
  '.prettierignore',
  '.npmrc',
])

export function repoRoot(start = process.env.CLAUDE_PROJECT_DIR || process.cwd()) {
  let dir = resolve(start)
  for (;;) {
    if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'apps', 'api'))) return dir
    const parent = dirname(dir)
    if (parent === dir) return resolve(start)
    dir = parent
  }
}

export function toRelative(root, path) {
  return relative(root, resolve(path)).split('\\').join('/')
}

// A root file touches every workspace the checkout has: a generated project
// has no installer package, so it is never checked.
export function affectedWorkspaces(paths, root = repoRoot()) {
  const dirs = WORKSPACES.map((w) => w.dir)
  const found = new Set()
  for (const path of paths) {
    const rel = path.split('\\').join('/').replace(/^\.\//, '')
    const owner = dirs.find((dir) => rel === dir || rel.startsWith(dir + '/'))
    if (owner) {
      found.add(owner)
      continue
    }
    if (rel.includes('/')) continue
    if (ROOT_AFFECTING.has(rel)) found.add('*')
  }
  if (found.has('*')) return dirs.filter((dir) => existsSync(join(root, dir, 'package.json')))
  return WORKSPACES.filter((w) => found.has(w.dir)).map((w) => w.dir)
}

// The files that carry secrets. `.env.example` is a template, not a secret.
export function isSecretPath(path) {
  const rel = path.split('\\').join('/').replace(/^\.\//, '')
  if (/(^|\/)\.env(\.[^/]*)?$/.test(rel) && !rel.endsWith('.example')) return true
  if (/\.(pem|key)$/.test(rel)) return true
  if (/(^|\/)package-lock\.json$/.test(rel)) return true
  return false
}

export function run(command, args, cwd, env = process.env) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd, shell: false, env })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    child.on('error', (error) => resolvePromise({ code: 1, output: String(error) }))
    child.on('close', (code) => resolvePromise({ code: code ?? 1, output }))
  })
}

// The environment without the variables that git sets for a hook, such as
// `GIT_DIR` and `GIT_INDEX_FILE`. They point at this repository, so a test that
// drives a repository of its own would otherwise write to this one.
export function isolatedEnv(env = process.env) {
  const local = new Set(
    execFileSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8' }).split('\n')
  )
  return Object.fromEntries(Object.entries(env).filter(([key]) => !local.has(key)))
}

export async function runChecks(workspaces, { files = [], root = repoRoot() } = {}) {
  const env = isolatedEnv()
  const results = []
  for (const dir of workspaces) {
    const workspace = WORKSPACES.find((w) => w.dir === dir)
    if (!workspace) continue

    if (workspace.typecheck) {
      const result = await run('npm', ['run', 'typecheck', '-w', workspace.name], root, env)
      results.push({
        workspace: dir,
        check: 'typecheck',
        ok: result.code === 0,
        output: result.output,
      })
    }

    if (workspace.test === 'node') {
      const result = await run('npm', ['test', '-w', workspace.name], root, env)
      results.push({ workspace: dir, check: 'test', ok: result.code === 0, output: result.output })
    }

    if (workspace.test === 'vitest') {
      const prefix = `${workspace.dir}/`
      const related = files
        .filter((file) => file.startsWith(prefix))
        .map((file) => file.slice(prefix.length))
      if (related.length === 0) continue
      const vitest = join(root, 'node_modules', 'vitest', 'vitest.mjs')
      if (!existsSync(vitest)) continue
      // Vitest runs from the workspace so it loads its `vite.config.ts` and the
      // `@/` alias. It reads the files as positional arguments: it has no `--`.
      const result = await run(
        'node',
        [vitest, 'related', '--run', ...related],
        join(root, workspace.dir),
        env
      )
      results.push({ workspace: dir, check: 'test', ok: result.code === 0, output: result.output })
    }
  }
  return { ok: results.every((result) => result.ok), results }
}

// The files of the index, as `git diff --cached` reports them.
export async function stagedPaths(root = repoRoot()) {
  const result = await run('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], root)
  return result.output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

// A file that is already in HEAD. A file that is only staged is not: it is new.
export async function isTracked(path, root = repoRoot()) {
  const result = await run('git', ['ls-tree', '--name-only', 'HEAD', '--', path], root)
  return result.code === 0 && result.output.trim().length > 0
}

// The files the formatter understands.
const PRETTIER_EXT =
  /\.(mjs|cjs|js|ts|mts|cts|jsx|tsx|json|json5|jsonc|ya?ml|css|scss|less|html|md|mdx|graphql|gql|vue|astro|toml|xml)$/i

export function isFormattable(path) {
  return PRETTIER_EXT.test(path)
}

export function owningWorkspaceOf(path) {
  return (
    WORKSPACES.map((w) => w.dir).find((dir) => path === dir || path.startsWith(dir + '/')) || null
  )
}

// The workspace that owns a file, when it has a linter. A workspace without
// one is never linted: ESLint would fail with "no configuration found".
export function lintedWorkspaceOf(path) {
  const dir = owningWorkspaceOf(path)
  if (!dir) return null
  return WORKSPACES.find((workspace) => workspace.dir === dir)?.lint ? dir : null
}

// The formatter and the linter of the staged files.
export async function runStyleChecks(files, { root = repoRoot() } = {}) {
  const results = []
  const formattable = files.filter(isFormattable)
  if (formattable.length) {
    const prettier = join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs')
    if (existsSync(prettier)) {
      const result = await run('node', [prettier, '--check', '--', ...formattable], root)
      results.push({
        workspace: 'repository',
        check: 'format',
        ok: result.code === 0,
        output: result.output,
      })
    }
  }

  const byWorkspace = new Map()
  for (const file of files) {
    const workspace = lintedWorkspaceOf(file)
    if (!workspace) continue
    if (!byWorkspace.has(workspace)) byWorkspace.set(workspace, [])
    byWorkspace.get(workspace).push(file)
  }
  const eslint = join(root, 'node_modules', 'eslint', 'bin', 'eslint.js')
  if (existsSync(eslint)) {
    for (const [workspace, workspaceFiles] of byWorkspace) {
      const inWorkspace = workspaceFiles.map((file) => file.slice(workspace.length + 1))
      const result = await run('node', [eslint, '--', ...inWorkspace], join(root, workspace))
      results.push({ workspace, check: 'lint', ok: result.code === 0, output: result.output })
    }
  }

  return { ok: results.every((result) => result.ok), results }
}

// The gate of the commit: the staged files are formatted, linted and checked,
// and a secret that is not already tracked is refused.
export async function checkStaged({ root = repoRoot() } = {}) {
  const staged = await stagedPaths(root)
  const secrets = []
  for (const path of staged) {
    if (!isSecretPath(path)) continue
    if (await isTracked(path, root)) continue
    secrets.push(path)
  }

  const workspaces = affectedWorkspaces(staged)
  const checks = await runChecks(workspaces, { files: staged, root })
  const style = await runStyleChecks(staged, { root })
  return { ok: secrets.length === 0 && checks.ok && style.ok, staged, secrets, checks, style }
}
