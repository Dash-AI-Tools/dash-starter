import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { repoRoot } from './checks.mjs'
import { AGENTS_DIR } from './opencode.mjs'

const ROOT = repoRoot()
const PLUGIN_AGENTS = 'plugins/dsh/agents'

// The agents that write code, and so have to scaffold through the generators.
const CODE_WRITERS = [
  'backend-dev',
  'frontend-dev',
  'ai-dev',
  'mcp-dev',
  'e2e-tester',
  'feature-orchestrator',
]

const SECTIONS = ['Scope', 'Owns', 'Must not touch', 'Commands', 'Done when']

// The roots a path of the repository starts with. A token outside them is a
// command, a glob or prose, not a path to check.
const PATH_ROOTS = /^(apps|packages|plugins|docs|e2e|openspec|\.opencode|\.githooks)\//

// The paths the installer removes from a generated project: its own workspace
// and the changes of the template. A project creates `openspec/changes/` with
// its first change, so a path under them is only checked where it exists.
const TEMPLATE_ONLY = ['packages/create-app', 'openspec/changes'].filter(
  (dir) => !existsSync(join(ROOT, dir))
)

function agents() {
  return readdirSync(join(ROOT, PLUGIN_AGENTS))
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.slice(0, -3))
}

function read(path) {
  return readFileSync(join(ROOT, path), 'utf8')
}

// The paths an agent names in code spans. A placeholder, a glob, a
// generated folder or a local `.env` cannot be checked in a clean checkout.
function namedPaths(text) {
  const paths = new Set()
  for (const [, span] of text.matchAll(/`([^`\n]+)`/g)) {
    const token = span.trim()
    if (!PATH_ROOTS.test(token)) continue
    if (/[<>*{}\s$]/.test(token)) continue
    if (/(^|\/)(\.adonisjs|build|dist|node_modules)(\/|$)/.test(token)) continue
    if (/(^|\/)\.env$/.test(token)) continue
    if (TEMPLATE_ONLY.some((dir) => token === dir || token.startsWith(`${dir}/`))) continue
    paths.add(token.replace(/[.,:;]+$/, ''))
  }
  return [...paths]
}

test('every agent definition has its sections, and every path it names exists', () => {
  const names = agents()
  assert.ok(names.length >= 8, `only ${names.length} agents`)
  for (const name of names) {
    const text = read(`${PLUGIN_AGENTS}/${name}.md`)
    for (const section of SECTIONS) {
      assert.match(text, new RegExp(`^## ${section}$`, 'm'), `${name} has no "${section}" section`)
    }
    for (const path of namedPaths(text)) {
      assert.ok(existsSync(join(ROOT, path)), `${name} names ${path}, which does not exist`)
    }
  }
})

test('the frontend agent stops instead of editing the API', () => {
  const text = read(`${PLUGIN_AGENTS}/frontend-dev.md`)
  const mustNot = text.split('## Must not touch')[1].split('\n## ')[0]
  assert.match(mustNot, /`apps\/api\/`/)
  assert.match(mustNot, /say so instead of editing it/)
})

for (const name of CODE_WRITERS) {
  test(`${name} generates before it writes, in Claude Code and in OpenCode`, () => {
    for (const path of [`${PLUGIN_AGENTS}/${name}.md`, `${AGENTS_DIR}/${name}.md`]) {
      const text = read(path)
      const commands = text.split(/^## Commands$/m)[1]?.split(/^## /m)[0] ?? ''
      assert.match(commands, /`npm run gen\b/, `the commands of ${path} do not name npm run gen`)
      assert.match(
        commands,
        /`npm run check\b/,
        `the commands of ${path} do not name npm run check`
      )
      assert.match(
        text,
        /write by hand only a layer the generators do not cover/i,
        `${path} does not limit hand-writing to the uncovered layers`
      )
    }
  })
}
