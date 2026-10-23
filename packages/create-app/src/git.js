/**
 * Initializes the repository of a generated project and commits everything
 * that is not a secret.
 */
export async function initRepository(dir, { run, identity }) {
  const init = await run('git', ['init'], { cwd: dir })

  if (init.code !== 0) {
    return { ok: false, reason: 'git init failed' }
  }

  await run('git', ['add', '-A'], { cwd: dir })

  const commit = await run('git', ['commit', '-m', 'Initial commit'], { cwd: dir })

  if (commit.code !== 0) {
    /**
     * A machine without a git identity cannot commit. The project carries its
     * own identity, so the first commit is possible everywhere.
     */
    const email = await run('git', ['config', 'user.email'], { cwd: dir, silent: true })

    if (email.code !== 0 || !email.output.trim()) {
      await run('git', ['config', 'user.name', identity.name], { cwd: dir })
      await run('git', ['config', 'user.email', identity.email], { cwd: dir })
      await run('git', ['commit', '-m', 'Initial commit'], { cwd: dir })
    }
  }

  const final = await run('git', ['log', '-1', '--oneline'], { cwd: dir, silent: true })

  /**
   * The gate of the commit of the project: the one of the template, so a
   * commit of a generated project passes the same checks.
   */
  await run('git', ['config', 'core.hooksPath', '.githooks'], { cwd: dir })

  return { ok: final.code === 0, reason: final.output.trim() }
}

/**
 * Creates a private repository in GitHub and pushes the project to it. A
 * machine without the GitHub CLI, or without a session in it, keeps the local
 * repository and gets the command to run by hand.
 */
export async function createRemote(dir, slug, { run }) {
  const result = await run('gh', ['repo', 'create', slug, '--private', '--source', '.', '--push'], {
    cwd: dir,
    silent: true,
  })

  if (result.code === 0) {
    return { ok: true, url: `https://github.com/${slug}` }
  }

  return {
    ok: false,
    reason: result.error ? result.error.message : result.output.trim(),
    manual: `gh repo create ${slug} --private --source . --push`,
  }
}
