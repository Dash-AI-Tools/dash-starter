// Stop hook: before a session ends, the workspaces that changed are typechecked
// and their fast tests are run. A failure keeps the session open.
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import { affectedWorkspaces, repoRoot, run, runChecks } from './checks.mjs'

export function parsePorcelain(output) {
  const paths = []
  for (const line of output.split('\n')) {
    if (!line.trim()) continue
    // The line is `XY <path>`, with the status of the index and of the work tree.
    const renamed = line.slice(3).includes('->') ? line.slice(3).split('->')[1] : line.slice(3)
    const path = renamed.trim().replace(/^"|"$/g, '')
    if (path) paths.push(path)
  }
  return paths
}

export async function changedPaths(root) {
  const result = await run('git', ['status', '--porcelain'], root)
  return parsePorcelain(result.output)
}

export async function check({ root = repoRoot(), files = null } = {}) {
  const paths = files || (await changedPaths(root))
  if (paths.length === 0) return { skipped: 'no changes', ok: true, results: [] }
  const workspaces = affectedWorkspaces(paths)
  if (workspaces.length === 0) return { skipped: 'no workspace affected', ok: true, results: [] }
  const checks = await runChecks(workspaces, { files: paths, root })
  return { skipped: null, ok: checks.ok, results: checks.results }
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
  if (input.stop_hook_active) process.exit(0)

  const root = repoRoot(input.cwd)
  const result = await check({ root })
  if (result.ok) process.exit(0)

  const failed = result.results
    .filter((entry) => !entry.ok)
    .map(
      (entry) =>
        `### ${entry.workspace}: ${entry.check}\n${entry.output.trim().split('\n').slice(-20).join('\n')}`
    )
    .join('\n\n')

  console.log(
    JSON.stringify({
      decision: 'block',
      reason: `The changed workspaces do not pass their checks. Fix them before ending the session.\n\n${failed}`,
    })
  )
}
