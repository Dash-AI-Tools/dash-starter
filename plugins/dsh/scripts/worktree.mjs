// The worktree of a feature: a checkout of its own, with its own branch, its
// own environment files and its own stack, so several features can run at the
// same time on the same machine.
//
// Usage: node plugins/dsh/scripts/worktree.mjs add|remove <change-id> <slot>
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

import { repoRoot, run } from './checks.mjs'

// The ports of the main checkout. The slot n takes the base plus 10·n, so
// slot 1 and slot 2 never fight for a port.
export const BASES = {
  dev: { db: 5433, mailpit: 8025, smtp: 1025, api: 3333, web: 5173 },
  e2e: { db: 5434, mailpit: 8026, smtp: 1026, api: 3334, web: 5174 },
}

// The files the developer keeps to themselves, copied into the worktree.
export const ENV_FILES = ['.env', 'apps/api/.env']

export function slotPorts(slot) {
  const offset = 10 * Number(slot)
  const shift = (group) =>
    Object.fromEntries(Object.entries(BASES[group]).map(([name, port]) => [name, port + offset]))
  return { dev: shift('dev'), e2e: shift('e2e') }
}

// The id of a change is the name of a directory and of a branch. It never
// carries a path, so a worktree can never leave `.claude/worktrees/`.
const CHANGE_ID = /^[a-z0-9][a-z0-9-]*$/

export function assertChangeId(changeId) {
  if (!changeId || !CHANGE_ID.test(changeId)) {
    throw new Error(`the change id has to be a kebab-case name, got "${changeId}"`)
  }
}

export function worktreePath(root, changeId) {
  return join(root, '.claude', 'worktrees', changeId)
}

export function branchName(changeId) {
  return `feat/${changeId}`
}

// The lines the worktree's root `.env` gets: the names of the projects and the
// ports of the two stacks of the worktree.
export function envLines(changeId, slot) {
  const { dev, e2e } = slotPorts(slot)
  return [
    '',
    `# dsh worktree ${changeId} (slot ${slot})`,
    `DEV_COMPOSE_PROJECT_NAME=dash-wt${slot}`,
    `DB_HOST_PORT=${dev.db}`,
    `MAILPIT_HOST_PORT=${dev.mailpit}`,
    `SMTP_HOST_PORT=${dev.smtp}`,
    `API_HOST_PORT=${dev.api}`,
    `WEB_HOST_PORT=${dev.web}`,
    `E2E_COMPOSE_PROJECT_NAME=dash-e2e-wt${slot}`,
    `E2E_DB_HOST_PORT=${e2e.db}`,
    `E2E_MAILPIT_HOST_PORT=${e2e.mailpit}`,
    `E2E_SMTP_HOST_PORT=${e2e.smtp}`,
    `E2E_API_HOST_PORT=${e2e.api}`,
    `E2E_WEB_HOST_PORT=${e2e.web}`,
    `E2E_WEB_URL=http://localhost:${e2e.web}`,
    `E2E_MAILPIT_URL=http://localhost:${e2e.mailpit}`,
    '',
  ].join('\n')
}

// The API of the worktree talks to the stack of the worktree.
function retargetApiEnv(file, { dev }) {
  const replacements = {
    PORT: String(dev.api),
    DB_PORT: String(dev.db),
    SMTP_PORT: String(dev.smtp),
    WEB_URL: `http://localhost:${dev.web}`,
  }
  const lines = readFileSync(file, 'utf8').split('\n')
  const updated = lines.map((line) => {
    const key = line.match(/^([A-Z_]+)=/)?.[1]
    return key && replacements[key] ? `${key}=${replacements[key]}` : line
  })
  writeFileSync(file, updated.join('\n'))
}

export async function addWorktree({ root = repoRoot(), changeId, slot }) {
  assertChangeId(changeId)
  if (!Number.isInteger(Number(slot)) || Number(slot) < 1) {
    throw new Error(`the slot has to be a number of 1 or more, got "${slot}"`)
  }

  const path = worktreePath(root, changeId)
  if (existsSync(path)) throw new Error(`${path} already exists`)

  mkdirSync(dirname(path), { recursive: true })
  const created = await run('git', ['worktree', 'add', '-b', branchName(changeId), path], root)
  if (created.code !== 0) throw new Error(created.output.trim())

  // The environment files of the developer are copied: they are not in the
  // repository, and the worktree needs its own.
  for (const file of ENV_FILES) {
    const source = join(root, file)
    if (!existsSync(source)) continue
    const target = join(path, file)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(source, target)
  }

  const envFile = join(path, '.env')
  appendFileSync(envFile, envLines(changeId, slot))

  const apiEnv = join(path, 'apps/api/.env')
  if (existsSync(apiEnv)) retargetApiEnv(apiEnv, slotPorts(slot))

  return { path, branch: branchName(changeId), ports: slotPorts(slot) }
}

export async function removeWorktree({ root = repoRoot(), changeId, slot }) {
  assertChangeId(changeId)
  const path = worktreePath(root, changeId)
  if (!existsSync(path)) throw new Error(`${path} does not exist`)

  // The stacks of the worktree go down with it, volumes included: the next
  // worktree of the same slot gets the same project name, and must not start
  // on the database of this one.
  await run('docker', ['compose', '-f', 'docker-compose.yml', 'down', '-v'], path)
  await run(
    'docker',
    ['compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.e2e.yml', 'down', '-v'],
    path
  )

  const removed = await run('git', ['worktree', 'remove', '--force', path], root)
  if (removed.code !== 0) {
    // The containers leave files the owner cannot delete; the worktree lives
    // in a disposable place, so it goes away anyway. The path is checked
    // against the directory of the worktrees first: only a worktree of this
    // repository is ever deleted.
    const inside = relative(join(root, '.claude', 'worktrees'), path)
    if (inside.startsWith('..') || isAbsolute(inside)) {
      throw new Error(`${path} is not a worktree of this repository`)
    }
    const { rmSync } = await import('node:fs')
    rmSync(path, { recursive: true, force: true })
    await run('git', ['worktree', 'prune'], root)
  }
  await run('git', ['branch', '-D', branchName(changeId)], root)
  return { path, branch: branchName(changeId) }
}

function summary({ changeId, slot, path, branch, ports }) {
  const { dev, e2e } = ports
  return [
    `Worktree of ${changeId} (slot ${slot})`,
    `  path:   ${path}`,
    `  branch: ${branch}`,
    `  stack:  dash-wt${slot} (dev) and dash-e2e-wt${slot} (e2e)`,
    `  ports:  dev db ${dev.db}, mailpit ${dev.mailpit}, smtp ${dev.smtp}, api ${dev.api}, web ${dev.web}`,
    `          e2e db ${e2e.db}, mailpit ${e2e.mailpit}, smtp ${e2e.smtp}, api ${e2e.api}, web ${e2e.web}`,
    `  e2e:    E2E_WEB_URL=http://localhost:${e2e.web} E2E_MAILPIT_URL=http://localhost:${e2e.mailpit} npm run test:e2e`,
  ].join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, changeId, slot] = process.argv.slice(2)
  const root = repoRoot()

  if (command === 'add') {
    const result = await addWorktree({ root, changeId, slot })
    console.log(summary({ changeId, slot, ...result }))
  } else if (command === 'remove') {
    const result = await removeWorktree({ root, changeId, slot })
    console.log(`Removed ${result.path} and the branch ${result.branch}.`)
  } else {
    console.error('Usage: worktree.mjs add|remove <change-id> <slot>')
    process.exit(1)
  }
}
