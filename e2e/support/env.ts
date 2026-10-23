import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The variables of the root `.env` reach the suite.
 *
 * A worktree keeps the origin of its own stack in that file, so the suite has
 * to drive the stack of the worktree it runs in and not the one of the main
 * checkout. The variables of the environment win: the suite is explicit about
 * them.
 */
export function loadRootEnv(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const file = join(root, '.env')

  if (!existsSync(file)) return

  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, value] = match
    if (process.env[key] !== undefined) continue

    process.env[key] = value.trim().replace(/^['"]|['"]$/g, '')
  }
}

loadRootEnv()
