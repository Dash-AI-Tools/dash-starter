/**
 * Whether Docker is installed and its daemon is running.
 */
export async function hasDocker({ run }) {
  const result = await run('docker', ['version', '--format', '{{.Server.Version}}'], {
    silent: true,
  })

  return result.code === 0
}

/**
 * Installs the dependencies of a generated project.
 */
export async function installDependencies(dir, { run }) {
  return run('npm', ['install'], { cwd: dir })
}

/**
 * Starts the stack of a generated project and seeds the plans of the product.
 */
export async function bootStack(dir, { run }) {
  const up = await run('docker', ['compose', 'up', '-d'], { cwd: dir })

  if (up.code !== 0) {
    return { ok: false, reason: 'docker compose up failed' }
  }

  /**
   * The API container installs the dependencies and runs the migrations before
   * it serves, so the stack is healthy once its probe answers.
   */
  const ready = await run('docker', ['compose', 'up', '-d', '--wait', '--wait-timeout', '300'], {
    cwd: dir,
  })

  if (ready.code !== 0) {
    return { ok: false, reason: 'the stack did not become healthy' }
  }

  const seeds = await run('docker', ['compose', 'exec', '-T', 'api', 'node', 'ace', 'db:seed'], {
    cwd: dir,
  })

  if (seeds.code !== 0) {
    return { ok: false, reason: 'the seeds failed' }
  }

  return { ok: true }
}
