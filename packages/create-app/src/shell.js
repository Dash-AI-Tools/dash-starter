import { spawn } from 'node:child_process'

/**
 * Runs a command and answers how it finished. The exit code is not an error
 * by itself: the callers decide what a failure means.
 */
export function run(command, args = [], { cwd, env, silent = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      stdio: silent ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })

    let output = ''

    if (silent) {
      child.stdout?.on('data', (chunk) => {
        output += chunk
      })
      child.stderr?.on('data', (chunk) => {
        output += chunk
      })
    }

    child.on('error', (error) => resolve({ code: 1, output, error }))
    child.on('close', (code) => resolve({ code: code ?? 1, output, error: null }))
  })
}
