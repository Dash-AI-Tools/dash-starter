import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { repoRoot } from './checks.mjs'
import {
  AGENTS_DIR,
  COMMANDS_DIR,
  PLUGIN_FILE,
  check,
  parseFrontmatter,
  rewrite,
  sync,
  toAgent,
  toCommand,
} from './opencode.mjs'

const AGENT = `---
name: security-reviewer
description: Delegate to this agent to review the diff — read-only.
tools: Read, Grep, Glob, Bash
model: inherit
---

## Scope

- Spawned by \`/dsh:review\`.
`

const SKILL = `---
name: backend
description: Implement the backend tasks of an OpenSpec change.
disable-model-invocation: true
argument-hint: '<change-id>'
---

Change: \`$ARGUMENTS\`

- Spawn the specialist with the Task tool, \`subagent_type: "dsh:backend-dev"\`, and give it the tasks.
`

function plugin() {
  const root = mkdtempSync(join(tmpdir(), 'dsh-opencode-'))
  mkdirSync(join(root, 'plugins/dsh/agents'), { recursive: true })
  mkdirSync(join(root, 'plugins/dsh/skills/backend'), { recursive: true })
  writeFileSync(join(root, 'plugins/dsh/agents/security-reviewer.md'), AGENT)
  writeFileSync(join(root, 'plugins/dsh/skills/backend/SKILL.md'), SKILL)
  return root
}

test('the frontmatter is read with its quotes taken off', () => {
  const { data, body } = parseFrontmatter(SKILL)
  assert.equal(data.name, 'backend')
  assert.equal(data['argument-hint'], '<change-id>')
  assert.match(body, /^\nChange:/)
})

test('the prompts name the OpenCode forms of the agents and the commands', () => {
  assert.equal(
    rewrite('Spawn it with the Task tool, `subagent_type: "dsh:docs-writer"`, now.'),
    'Spawn it with the subagent tool, agent `dsh/docs-writer`, now.'
  )
  assert.equal(
    rewrite('Run `/dsh:review`, then `dsh:<agent>`.'),
    'Run `/dsh/review`, then `dsh/<agent>`.'
  )
  assert.equal(
    rewrite('Follow `plugins/dsh/skills/review/SKILL.md` and `plugins/dsh/agents/<name>.md`.'),
    'Follow `.opencode/commands/dsh/review.md` and `.opencode/agents/dsh/<name>.md`.'
  )
  assert.equal(
    rewrite('`dsh@dash-starter` and `plugins/dsh/scripts`'),
    '`dsh@dash-starter` and `plugins/dsh/scripts`'
  )
})

test('an agent without a tool is denied its OpenCode action', () => {
  const agent = toAgent(AGENT, 'plugins/dsh/agents/security-reviewer.md')
  assert.match(
    agent,
    /^---\ndescription: "Delegate to this agent to review the diff — read-only."\nmode: subagent\n/
  )
  assert.match(agent, /- action: edit\n {4}resource: '\*'\n {4}effect: deny/)
  assert.match(agent, /- action: subagent\n/)
  assert.doesNotMatch(agent, /action: shell/)
  assert.doesNotMatch(agent, /^(name|tools|model):/m)
  assert.match(agent, /Generated from plugins\/dsh\/agents\/security-reviewer\.md/)
  assert.match(agent, /Spawned by `\/dsh\/review`\./)
})

test('an agent with every tool has no permission rule', () => {
  const agent = toAgent(AGENT.replace('Bash', 'Bash, Edit, Write, Agent'), 'a.md')
  assert.doesNotMatch(agent, /permissions:/)
})

test('a skill becomes a command with its arguments in the description', () => {
  const command = toCommand(SKILL, 'plugins/dsh/skills/backend/SKILL.md')
  assert.match(
    command,
    /^---\ndescription: "Implement the backend tasks of an OpenSpec change. Arguments: <change-id>."\n---\n/
  )
  assert.doesNotMatch(command, /disable-model-invocation|argument-hint/)
  assert.match(command, /Change: `\$ARGUMENTS`/)
  assert.match(command, /the subagent tool, agent `dsh\/backend-dev`/)
})

test('sync writes the files and check finds them up to date', () => {
  const root = plugin()
  assert.equal(check(root).ok, false)
  const { written } = sync(root)
  assert.deepEqual(written.sort(), [
    `${AGENTS_DIR}/security-reviewer.md`,
    `${COMMANDS_DIR}/backend.md`,
    PLUGIN_FILE,
  ])
  assert.match(readFileSync(join(root, PLUGIN_FILE), 'utf8'), /opencode-plugin\.mjs/)
  assert.deepEqual(check(root), { ok: true, missing: [], stale: [], extra: [] })
  assert.deepEqual(sync(root), { written: [], removed: [] })
})

test('check fails on an edited, a missing or a left over file, and sync repairs them', () => {
  const root = plugin()
  sync(root)
  writeFileSync(join(root, AGENTS_DIR, 'security-reviewer.md'), 'edited by hand\n')
  writeFileSync(join(root, COMMANDS_DIR, 'removed.md'), 'an old command\n')
  writeFileSync(
    join(root, 'plugins/dsh/skills/backend/SKILL.md'),
    SKILL.replace('backend tasks', 'API tasks')
  )

  const result = check(root)
  assert.equal(result.ok, false)
  assert.deepEqual(result.stale.sort(), [
    `${AGENTS_DIR}/security-reviewer.md`,
    `${COMMANDS_DIR}/backend.md`,
  ])
  assert.deepEqual(result.extra, [`${COMMANDS_DIR}/removed.md`])

  sync(root)
  assert.equal(existsSync(join(root, COMMANDS_DIR, 'removed.md')), false)
  assert.equal(check(root).ok, true)
})

// The drift guard of the repository: an agent or a skill that changes without
// `sync` fails the test command of the plugin.
test('the OpenCode files of the repository are in sync with the plugin', () => {
  const result = check(repoRoot())
  assert.ok(
    result.ok,
    `Run \`node plugins/dsh/scripts/opencode.mjs sync\`: ${JSON.stringify(result)}`
  )
})
