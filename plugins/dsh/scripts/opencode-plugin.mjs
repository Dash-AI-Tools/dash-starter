// OpenCode plugin of the harness: the guardrails of the Claude Code hooks on the
// hooks of the OpenCode plugin API (V2). It runs the same code, so the two never
// drift: `protect-files.mjs` refuses the call before a tool writes, with the same
// `.claude/dsh-allow`; `format-lint.mjs` formats and lints the file after an
// edit; `stop-check.mjs` checks the changed workspaces when the agent stops.
// `.opencode/plugins/dsh.js` loads it.
import { resolve } from 'node:path'

import { repoRoot } from './checks.mjs'
import { checkFile, failureReason as lintReason } from './format-lint.mjs'
import { main as protect } from './protect-files.mjs'
import { check, failureReason as checkReason } from './stop-check.mjs'

const SHELL_TOOLS = new Set(['shell', 'bash'])
const PATCH_TOOLS = new Set(['patch', 'apply_patch'])
const EDIT_TOOLS = new Set(['write', 'edit', 'multiedit'])

// The events that say the agent stopped: V2 ends an execution, V1 went idle.
const STOP_EVENTS = new Set(['session.execution.succeeded', 'session.idle'])

// The files a patch writes: the ones it adds, updates, deletes or moves to.
export function patchPaths(text = '') {
  const paths = []
  for (const match of String(text).matchAll(
    /^\*\*\* (?:(?:Add|Update|Delete) File|Move to): (.+)$/gm
  )) {
    paths.push(match[1].trim())
  }
  return paths
}

// The files a tool call writes, as the tool names them.
export function editedPaths(tool, input = {}) {
  const name = String(tool ?? '').toLowerCase()
  if (PATCH_TOOLS.has(name)) return patchPaths(input.patchText)
  if (!EDIT_TOOLS.has(name)) return []
  const path = input.path ?? input.filePath ?? input.file_path
  return path ? [String(path)] : []
}

// The inputs of the Claude Code hook for a tool call of OpenCode, so the guard
// reads them with its own rules. A relative path is relative to the project.
export function hookInputs(event, directory) {
  const tool = String(event?.tool ?? '').toLowerCase()
  const input = event?.input ?? {}
  if (SHELL_TOOLS.has(tool)) {
    const cwd = input.workdir ? resolve(directory, String(input.workdir)) : directory
    return [{ tool_name: 'Bash', tool_input: { command: String(input.command ?? '') }, cwd }]
  }
  return editedPaths(tool, input).map((path) => ({
    tool_name: 'Write',
    tool_input: { file_path: resolve(directory, path) },
    cwd: directory,
  }))
}

// Adds a note to the result of a tool call: the agent reads it with the output.
export function appendText(event, text) {
  const result = event.result ?? (event.result = {})
  if (Array.isArray(result.content)) result.content.push({ type: 'text', text })
  else if (typeof result.content === 'string') result.content = `${result.content}\n\n${text}`
  else result.content = [{ type: 'text', text }]
}

// What happens when the agent of a session stops. A session that ran no tool
// here changed nothing; a subagent reports to its parent, which is checked when
// it stops; a session resumed by a failed check stops the second time, as
// `stop_hook_active` lets the Claude Code session stop.
export function stopHandler({ ctx, root, sessions, checks = check }) {
  const continued = new Set()
  const running = new Set()
  return async (event) => {
    if (!STOP_EVENTS.has(event?.type)) return
    const sessionID = event.data?.sessionID ?? event.properties?.sessionID
    if (!sessionID || !sessions.has(sessionID) || running.has(sessionID)) return
    if (continued.delete(sessionID)) return

    const info = await Promise.resolve(ctx.session?.get?.({ sessionID })).catch(() => null)
    if ((info?.data ?? info)?.parentID) return

    running.add(sessionID)
    try {
      const result = await checks({ root })
      if (result.ok) return
      continued.add(sessionID)
      await ctx.session.prompt({ sessionID, text: checkReason(result) })
    } finally {
      running.delete(sessionID)
    }
  }
}

// The checks take minutes, so every event is handled on its own: a stream that
// waits for them would overflow and drop the events that come meanwhile.
async function watch(ctx, signal, handle) {
  try {
    for await (const event of ctx.event.subscribe({ signal })) {
      handle(event).catch((error) => console.error(`[dsh] the stop check failed: ${error}`))
    }
  } catch (error) {
    if (!signal.aborted) console.error(`[dsh] the event stream stopped: ${error}`)
  }
}

export function createPlugin({ guard = protect, lint = checkFile, checks = check } = {}) {
  return {
    id: 'dsh',
    async setup(ctx) {
      const directory = ctx.location?.directory ?? process.cwd()
      const root = repoRoot(directory)
      const sessions = new Set()

      // A thrown error refuses the call, and its message is what the agent reads.
      await ctx.tool.hook('execute.before', (event) => {
        for (const input of hookInputs(event, directory)) {
          const result = guard(input, root)
          if (result.blocked) throw new Error(result.reason)
        }
      })

      await ctx.tool.hook('execute.after', async (event) => {
        if (event?.sessionID) sessions.add(event.sessionID)
        if (event?.status !== 'completed') return
        const notes = []
        for (const path of editedPaths(event.tool, event.input)) {
          const result = await lint(resolve(directory, path), root)
          if (!result.ok) notes.push(lintReason(path, result))
        }
        if (notes.length) appendText(event, notes.join('\n\n'))
      })

      const controller = new AbortController()
      watch(ctx, controller.signal, stopHandler({ ctx, root, sessions, checks }))
      return () => controller.abort()
    },
  }
}

export default createPlugin()
