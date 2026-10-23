import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { repoRoot } from './checks.mjs'
import { findLayer, knownLayers, loadLayers, plain } from './context.mjs'

export const SKIPPED_DIRS = new Set([
  'node_modules',
  '.git',
  'build',
  'dist',
  'tmp',
  '.adonisjs',
  'storybook-static',
  'test-results',
  'coverage',
  // The worktrees of parallel features and the state of other agents: no
  // generator writes there, and another agent's files must not be reported.
  '.claude',
  '.serena',
  '.opencode',
])

// Secrets are never read, not even to hash them.
const isEnvFile = (name) => name.startsWith('.env')

// An ace name may carry folders (`admin/invoices`), never `..` nor a leading `/`.
export const ACE_NAME = /^[A-Za-z][A-Za-z0-9_-]*(?:\/[A-Za-z][A-Za-z0-9_-]*)*$/
// A plain kebab name: anything else reaches shadcn as a URL or a local registry file.
export const KEBAB_NAME = /^[a-z][a-z0-9-]*$/
const ACTION = /^[A-Za-z][A-Za-z0-9_]*$/
const OVERWRITE_FLAG = /^(?:--force|-f|--overwrite|-o)(?:=.*)?$/

const isAce = (generator) => generator.run[1] === 'ace'

export function validName(layer, name, layers = loadLayers()) {
  return (isAce(layers.generators[layer]) ? ACE_NAME : KEBAB_NAME).test(name)
}

// A flag of `generators.<layer>.flags`: `--resource` as is, `--stack=<a|b>` with
// one of the values, `--suite=<name>` with a value shaped like an ace name.
function flagMatches(spec, flag) {
  const [, key, values] = spec.match(/^(--[a-z-]+)(?:=<(.+)>)?$/)
  if (values === undefined) return flag === key
  if (!flag.startsWith(`${key}=`)) return false
  const value = flag.slice(key.length + 1)
  return values.includes('|') ? values.split('|').includes(value) : ACE_NAME.test(value)
}

// The arguments after the name, against the allowlist of the layer. Anything
// else could overwrite (`-f`), read any file (`--contents-from`), write outside
// the workspace (`--cwd`, `--path`) or answer a prompt (`-y`), so it is refused.
export function refuseFlags(layer, flags, layers = loadLayers()) {
  const generator = layers.generators[layer]
  const allowed = generator.flags ?? []
  const refused = flags.filter((flag) =>
    flag.startsWith('-')
      ? !allowed.some((spec) => flagMatches(spec, flag))
      : !(generator.actions && ACTION.test(flag))
  )
  if (!refused.length) return null
  const accepted = [...allowed, ...(generator.actions ? ['action names'] : [])]
  const lines = [
    `Refused: ${refused.join(' ')}. ${layer} accepts ${accepted.length ? `only ${accepted.join(', ')}` : 'no flags'}.`,
  ]
  if (refused.some((flag) => OVERWRITE_FLAG.test(flag))) {
    lines.push('The generators never overwrite a file.')
  }
  return lines.join('\n')
}

// Every file under `dirs` (the whole root without them), plus the files at the
// root itself, where a generator may touch package.json or package-lock.json.
export function snapshot(root, dirs = null) {
  const files = new Map()
  const walk = (dir, prefix, deep = true) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        if (deep && !SKIPPED_DIRS.has(entry.name)) walk(join(dir, entry.name), rel)
      } else if (entry.isFile() && !isEnvFile(entry.name)) {
        files.set(
          rel,
          createHash('sha1')
            .update(readFileSync(join(dir, entry.name)))
            .digest('hex')
        )
      }
    }
  }
  if (!dirs) walk(root, '')
  else {
    walk(root, '', false)
    for (const dir of dirs) {
      const path = join(root, dir)
      if (existsSync(path) && statSync(path).isDirectory()) walk(path, dir)
    }
  }
  return files
}

export function diffSnapshots(before, after) {
  const created = []
  const modified = []
  for (const [path, hash] of after) {
    if (!before.has(path)) created.push(path)
    else if (before.get(path) !== hash) modified.push(path)
  }
  return { created: created.sort(), modified: modified.sort() }
}

export function tail(output, count = 15) {
  const lines = output
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
  return lines.slice(-count).join('\n')
}

function refuseLayer(layer, layers) {
  const found = layer ? findLayer(layer, layers) : null
  if (found && !found.generator) {
    const { row } = found
    if (row.generator === '—') {
      return `No generator covers "${layer}" (${row.change}): write it by imitating ${plain(row.imitate)}, registered in ${plain(row.files)}.`
    }
    return `"${layer}" is a kind of change, not a generator layer: run ${plain(row.generator)}.`
  }
  const names = Object.keys(layers.generators).join(', ')
  return `Unknown layer "${layer ?? ''}". Generator layers: ${names}. Every layer: npm run context -- <layer> (${knownLayers(layers).length} known).`
}

export function run(command, args, cwd) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk) => (output += chunk))
    child.stderr.on('data', (chunk) => (output += chunk))
    child.on('error', (error) => resolvePromise({ code: 1, output: String(error) }))
    child.on('close', (code) => resolvePromise({ code: code ?? 1, output }))
  })
}

export function plan(layer, name, flags, layers = loadLayers()) {
  const generator = layers.generators[layer]
  const [command, ...base] = generator.run
  const args = [...base, name, ...flags]
  if (layer === 'primitive') args.push('--yes')
  // A function replacement: a string one would expand `$&` and `` $` `` in the name.
  const targets = [generator.target ?? []]
    .flat()
    .map((target) => target.replaceAll('<name>', () => name))
  // The folders the generator can write, walked before and after it runs.
  const dirs = [...new Set([generator.cwd, ...(generator.writes ?? [])])].filter(
    (dir) => dir !== '.'
  )
  return { command, args, cwd: generator.cwd, targets, dirs }
}

export async function gen(argv, { root = repoRoot(), runner = run, layers = loadLayers() } = {}) {
  const [layer, name, ...flags] = argv
  if (!layer || !layers.generators[layer]) return { code: 1, out: refuseLayer(layer, layers) }
  if (!name || name.startsWith('-')) {
    return { code: 1, out: `A name is required: npm run gen -- ${layer} <name> [flags]` }
  }
  if (!validName(layer, name, layers)) {
    const shape = isAce(layers.generators[layer])
      ? 'letters, digits, _ and -, with / between folders'
      : 'lowercase kebab-case, e.g. data-card'
    return { code: 1, out: `"${name}" is not a valid ${layer} name: use ${shape}.` }
  }
  const refusal = refuseFlags(layer, flags, layers)
  if (refusal) return { code: 1, out: refusal }

  const { command, args, cwd, targets, dirs } = plan(layer, name, flags, layers)
  const existing = targets.filter((target) => existsSync(join(root, target)))
  if (existing.length) {
    return { code: 1, out: `The target exists, nothing was generated: ${existing.join(', ')}` }
  }

  const before = snapshot(root, dirs)
  const result = await runner(command, args, join(root, cwd))
  const { created, modified } = diffSnapshots(before, snapshot(root, dirs))
  const listed = [...created, ...modified.map((path) => `modified: ${path}`)]

  if (result.code !== 0) {
    const lines = [`${command} ${args.join(' ')} failed in ${cwd} (exit ${result.code}):`]
    if (layer === 'primitive') {
      lines.push('shadcn needs the network to fetch the primitive from its registry.')
    }
    lines.push(tail(result.output))
    if (listed.length) lines.push('It left behind:', ...listed)
    return { code: result.code || 1, out: lines.join('\n') }
  }

  if (created.length === 0) {
    const reason = tail(result.output)
      .split('\n')
      .filter((line) => /exist|skip/i.test(line))
    if (reason.length) {
      return {
        code: 1,
        out: ['The target exists, nothing was generated.', ...reason, ...listed].join('\n'),
      }
    }
    return {
      code: 1,
      out: [
        `${command} ${args.join(' ')} created nothing in ${cwd}. If it asked a question, pass the flag that answers it.`,
        tail(result.output, 5),
        ...listed,
      ].join('\n'),
    }
  }

  const lines = [...listed]
  if (created.some((path) => path.startsWith('apps/api/database/migrations/'))) {
    lines.push('Next: node ace migration:run in apps/api, it regenerates database/schema.ts.')
  }
  return { code: 0, out: lines.join('\n') }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await gen(process.argv.slice(2))
  ;(result.code === 0 ? process.stdout : process.stderr).write(result.out + '\n')
  process.exit(result.code)
}
