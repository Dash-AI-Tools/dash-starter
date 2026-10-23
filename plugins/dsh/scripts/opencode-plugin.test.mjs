import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  appendText,
  createPlugin,
  editedPaths,
  hookInputs,
  patchPaths,
  stopHandler,
} from './opencode-plugin.mjs'

// A repository the guard recognises: `repoRoot` looks for `apps/api`.
function repository() {
  const root = mkdtempSync(join(tmpdir(), 'dsh-opencode-plugin-'))
  mkdirSync(join(root, 'apps/api'), { recursive: true })
  mkdirSync(join(root, '.claude'), { recursive: true })
  writeFileSync(join(root, 'package.json'), '{}\n')
  return root
}

// The part of the plugin context the plugin uses, with the hooks it registers
// and the prompts it sends.
function context(directory, { events = [], session = {} } = {}) {
  const hooks = {}
  const prompts = []
  return {
    hooks,
    prompts,
    location: { directory },
    tool: { hook: async (name, callback) => (hooks[name] = callback) },
    session: {
      get: async ({ sessionID }) => ({ id: sessionID, ...session }),
      prompt: async (input) => prompts.push(input),
    },
    event: {
      subscribe: async function* () {
        yield* events
      },
    },
  }
}

const PATCH = [
  '*** Begin Patch',
  '*** Add File: apps/web/src/a.ts',
  '+export const a = 1',
  '*** Update File: apps/api/.env',
  '@@',
  '-A=1',
  '+A=2',
  '*** Move to: apps/api/.env.local',
  '*** Delete File: old.md',
  '*** End Patch',
].join('\n')

test('the files of a patch are the ones it adds, updates, moves to and deletes', () => {
  assert.deepEqual(patchPaths(PATCH), [
    'apps/web/src/a.ts',
    'apps/api/.env',
    'apps/api/.env.local',
    'old.md',
  ])
})

test('the edited files come from the write, edit and patch tools only', () => {
  assert.deepEqual(editedPaths('write', { path: '.env', content: 'x' }), ['.env'])
  assert.deepEqual(editedPaths('edit', { path: 'a.ts', oldString: 'a', newString: 'b' }), ['a.ts'])
  assert.deepEqual(editedPaths('patch', { patchText: PATCH }).length, 4)
  assert.deepEqual(editedPaths('read', { path: '.env' }), [])
  assert.deepEqual(editedPaths('shell', { command: 'ls' }), [])
})

test('a tool call becomes the input of the Claude Code hook, relative to the project', () => {
  assert.deepEqual(hookInputs({ tool: 'write', input: { path: 'apps/api/.env' } }, '/repo'), [
    { tool_name: 'Write', tool_input: { file_path: '/repo/apps/api/.env' }, cwd: '/repo' },
  ])
  assert.deepEqual(
    hookInputs(
      { tool: 'shell', input: { command: 'echo x > .env', workdir: 'apps/api' } },
      '/repo'
    ),
    [{ tool_name: 'Bash', tool_input: { command: 'echo x > .env' }, cwd: '/repo/apps/api' }]
  )
  assert.deepEqual(hookInputs({ tool: 'grep', input: { pattern: 'x' } }, '/repo'), [])
})

test('a note is added to the result the agent reads', () => {
  const event = { result: { content: [{ type: 'text', text: 'Wrote a.ts' }] } }
  appendText(event, 'The lint failed.')
  assert.deepEqual(event.result.content[1], { type: 'text', text: 'The lint failed.' })

  const text = { result: { content: 'Wrote a.ts' } }
  appendText(text, 'The lint failed.')
  assert.equal(text.result.content, 'Wrote a.ts\n\nThe lint failed.')
})

test('a write to a protected file is refused with the reason of the guard', async () => {
  const root = repository()
  const ctx = context(root)
  await createPlugin({ checks: async () => ({ ok: true }) }).setup(ctx)
  const before = ctx.hooks['execute.before']

  assert.throws(
    () => before({ tool: 'write', input: { path: 'apps/api/.env', content: 'A=1' } }),
    /Blocked by the dsh guardrail: `apps\/api\/\.env` is protected[\s\S]*\.claude\/dsh-allow/
  )
  assert.throws(() => before({ tool: 'patch', input: { patchText: PATCH } }), /apps\/api\/\.env/)
  assert.throws(
    () => before({ tool: 'shell', input: { command: 'npm install left-pad' } }),
    /package-lock\.json/
  )
  assert.doesNotThrow(() => before({ tool: 'write', input: { path: '.env.example', content: '' } }))
  assert.doesNotThrow(() => before({ tool: 'read', input: { path: 'apps/api/.env' } }))
})

test('the allowance file releases the env files, as for Claude Code', async () => {
  const root = repository()
  writeFileSync(join(root, '.claude/dsh-allow'), 'env\n')
  const ctx = context(root)
  await createPlugin({ checks: async () => ({ ok: true }) }).setup(ctx)
  const before = ctx.hooks['execute.before']

  assert.doesNotThrow(() => before({ tool: 'edit', input: { path: 'apps/api/.env' } }))
  assert.throws(
    () => before({ tool: 'write', input: { path: '.claude/dsh-allow' } }),
    /written by the developer/
  )
})

test('a file that fails its lint is reported in the result of the edit', async () => {
  const root = repository()
  const ctx = context(root)
  const linted = []
  const lint = async (path) => {
    linted.push(path)
    return { ok: false, step: 'lint', output: '  2:9  error  unused  no-unused-vars\n' }
  }
  await createPlugin({ lint, checks: async () => ({ ok: true }) }).setup(ctx)
  const after = ctx.hooks['execute.after']

  const event = {
    tool: 'write',
    sessionID: 'ses_1',
    status: 'completed',
    input: { path: 'apps/web/src/a.ts' },
    result: { content: [{ type: 'text', text: 'Created file successfully: apps/web/src/a.ts' }] },
  }
  await after(event)
  assert.deepEqual(linted, [join(root, 'apps/web/src/a.ts')])
  assert.match(event.result.content[1].text, /^The lint of `apps\/web\/src\/a\.ts` failed\. Fix it/)

  const failed = { tool: 'write', status: 'error', input: { path: 'b.ts' }, result: {} }
  await after(failed)
  assert.equal(linted.length, 1)
})

test('a stop with failing checks resumes the session once, with the failures', async () => {
  const ctx = context('/repo')
  const sessions = new Set(['ses_1'])
  const runs = []
  const checks = async ({ root }) => {
    runs.push(root)
    return {
      ok: false,
      results: [{ workspace: 'apps/web', check: 'typecheck', ok: false, output: 'TS2322\n' }],
    }
  }
  const stop = stopHandler({ ctx, root: '/repo', sessions, checks })
  const event = { type: 'session.execution.succeeded', data: { sessionID: 'ses_1' } }

  await stop(event)
  assert.deepEqual(runs, ['/repo'])
  assert.equal(ctx.prompts.length, 1)
  assert.equal(ctx.prompts[0].sessionID, 'ses_1')
  assert.match(
    ctx.prompts[0].text,
    /do not pass their checks[\s\S]*### apps\/web: typecheck\nTS2322/
  )

  // The session the check resumed stops the second time, as with `stop_hook_active`.
  await stop(event)
  assert.equal(runs.length, 1)
  await stop(event)
  assert.equal(runs.length, 2)
})

test('a stop is not checked for other events, untouched sessions or subagents', async () => {
  let runs = 0
  const checks = async () => (runs++, { ok: true, results: [] })

  const ctx = context('/repo')
  const stop = stopHandler({ ctx, root: '/repo', sessions: new Set(['ses_1']), checks })
  await stop({ type: 'session.text.delta', data: { sessionID: 'ses_1' } })
  await stop({ type: 'session.execution.succeeded', data: { sessionID: 'ses_other' } })
  assert.equal(runs, 0)

  const child = context('/repo', { session: { parentID: 'ses_parent' } })
  await stopHandler({ ctx: child, root: '/repo', sessions: new Set(['ses_1']), checks })({
    type: 'session.execution.succeeded',
    data: { sessionID: 'ses_1' },
  })
  assert.equal(runs, 0)

  await stop({ type: 'session.execution.succeeded', data: { sessionID: 'ses_1' } })
  assert.equal(runs, 1)
  assert.equal(ctx.prompts.length, 0)
})

test('the plugin checks the session when the event stream says it stopped', async () => {
  const root = repository()
  const events = [{ type: 'session.execution.succeeded', data: { sessionID: 'ses_1' } }]
  const ctx = context(root, { events })
  const checked = []
  const checks = async (input) => (checked.push(input.root), { ok: true, results: [] })
  const plugin = createPlugin({ lint: async () => ({ ok: true }), checks })

  assert.equal(plugin.id, 'dsh')
  // The tool runs before the agent stops, so the session is known.
  ctx.event.subscribe = async function* () {
    await ctx.hooks['execute.after']({ tool: 'grep', sessionID: 'ses_1', status: 'completed' })
    yield* events
  }
  const dispose = await plugin.setup(ctx)
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.deepEqual(checked, [root])
  dispose()
})
