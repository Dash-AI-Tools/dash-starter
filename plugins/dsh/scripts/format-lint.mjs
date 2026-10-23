// PostToolUse hook: formats the file that changed and lints it with the linter
// of the workspace that owns it. A lint error is reported back to the agent.
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { lintedWorkspaceOf, repoRoot, run, toRelative } from './checks.mjs'

// The workspace that owns the file, when it has a linter.
export function owningWorkspace(relPath) {
  return lintedWorkspaceOf(relPath)
}

// The binaries of the repository, run with node directly: `npx` would look for
// them in the working directory and would try to download them when it does
// not find them.
export function binary(root, relative) {
  const path = join(root, 'node_modules', relative)
  return existsSync(path) ? path : null
}

export async function formatFile(relPath, root = repoRoot()) {
  const prettier = binary(root, 'prettier/bin/prettier.cjs')
  if (!prettier) return { ok: true, output: '' }
  const result = await run('node', [prettier, '--write', relPath], root)
  // Prettier has no parser for this kind of file: there is nothing to format.
  if (result.code !== 0 && result.output.includes('No parser could be inferred')) {
    return { ok: true, output: '' }
  }
  return { ok: result.code === 0, output: result.output }
}

export async function lintFile(relPath, root = repoRoot()) {
  const workspace = owningWorkspace(relPath)
  if (!workspace) return { ok: true, output: '', workspace: null }
  const eslint = binary(root, 'eslint/bin/eslint.js')
  if (!eslint) return { ok: true, output: '', workspace }
  const inWorkspace = relPath.slice(workspace.length + 1)
  const result = await run('node', [eslint, inWorkspace], join(root, workspace))
  return { ok: result.code === 0, output: result.output, workspace }
}

export async function checkFile(filePath, root = repoRoot()) {
  if (!existsSync(filePath)) return { ok: true, output: '' }
  const relPath = toRelative(root, filePath)
  const formatted = await formatFile(relPath, root)
  if (!formatted.ok) return { ok: false, output: formatted.output, step: 'format' }
  const linted = await lintFile(relPath, root)
  if (!linted.ok) return { ok: false, output: linted.output, step: 'lint' }
  return { ok: true, output: '', step: null }
}

function readInput() {
  try {
    return JSON.parse(readFileSync(0, 'utf8'))
  } catch {
    return {}
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = readInput()
  const filePath = input.tool_input?.file_path
  if (!filePath) process.exit(0)
  const result = await checkFile(resolve(filePath), repoRoot(input.cwd))
  if (!result.ok) {
    console.log(
      JSON.stringify({
        decision: 'block',
        reason: `The ${result.step} of \`${filePath}\` failed. Fix it and try again.\n\n${result.output.trim()}`,
      })
    )
  }
  process.exit(0)
}
