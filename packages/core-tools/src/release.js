import { copyFile, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { DEFAULT_EXCLUDE, listFiles } from './files.js'

/**
 * The shape of a git ref the updater accepts: a tag, a branch or a commit.
 * Nothing that could name another source (`:`, `//`) or climb a path (`..`).
 */
const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/

/**
 * The shape of a version: `0.2.0`, with an optional pre-release.
 */
const VERSION_PATTERN = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

/**
 * Reads the recorded repository. Only GitHub, over HTTPS, is accepted: the
 * release is a trust boundary and the updater never talks to another host.
 */
export function parseRepository(repository) {
  const match =
    /^github:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(repository) ??
    /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(repository)

  if (!match || match[1].startsWith('.') || match[2].startsWith('.')) {
    throw new Error(
      `The repository "${repository}" is not supported: use "github:owner/name" or an https://github.com address`
    )
  }

  return { owner: match[1], name: match[2] }
}

/**
 * Checks a ref, so it can only select a release of the recorded repository.
 */
export function assertRef(ref) {
  if (typeof ref !== 'string' || !REF_PATTERN.test(ref) || ref.includes('..')) {
    throw new Error(`"${ref}" is not a valid version or ref`)
  }

  return ref
}

/**
 * The ref and the version of a `--to` value: `0.2.0` and `v0.2.0` select the
 * tag `v0.2.0` and record `0.2.0`; any other ref is used and recorded as it
 * is.
 */
export function targetFromInput(to) {
  assertRef(to)

  if (VERSION_PATTERN.test(to)) {
    const version = to.replace(/^v/, '')

    return { ref: `v${version}`, version }
  }

  return { ref: to, version: to }
}

/**
 * Resolves the release to update to: the `--to` value, or the latest GitHub
 * release of the recorded repository. `fetch` is the seam the tests replace.
 */
export async function resolveTarget(repository, to, { fetch = globalThis.fetch } = {}) {
  const { owner, name } = parseRepository(repository)

  if (to) return targetFromInput(to)

  const url = `https://api.github.com/repos/${owner}/${name}/releases/latest`
  let response

  try {
    response = await fetch(url, {
      headers: { 'accept': 'application/vnd.github+json', 'user-agent': 'core-tools' },
    })
  } catch (error) {
    throw new Error(`The latest release of ${owner}/${name} could not be read: ${error.message}`, {
      cause: error,
    })
  }

  if (!response.ok) {
    throw new Error(
      `The latest release of ${owner}/${name} could not be read: HTTP ${response.status}`
    )
  }

  let release

  try {
    release = await response.json()
  } catch {
    throw new Error(`The latest release of ${owner}/${name} is malformed: the answer is not JSON`)
  }

  if (!release || typeof release.tag_name !== 'string') {
    throw new Error(`The latest release of ${owner}/${name} is malformed: it has no tag`)
  }

  /**
   * The answer must describe a release of the recorded repository.
   */
  const home = `https://github.com/${owner}/${name}/`.toLowerCase()

  if (typeof release.html_url === 'string' && !release.html_url.toLowerCase().startsWith(home)) {
    throw new Error(`The latest release does not belong to ${owner}/${name}: ${release.html_url}`)
  }

  try {
    return targetFromInput(release.tag_name)
  } catch {
    throw new Error(
      `The latest release of ${owner}/${name} is malformed: "${release.tag_name}" is not a valid tag`
    )
  }
}

/**
 * Downloads a release of the recorded repository into a new temporary
 * directory. `download` is the seam the tests replace; by default it is
 * giget, which the installer uses too and which fetches GitHub over HTTPS.
 *
 * The caller owns the directory and removes it with `cleanup`; on a failure
 * it is removed here, before the error leaves. `tmp` is where the temporary
 * directory is created.
 */
export async function downloadRelease(repository, ref, { download, tmp = tmpdir() } = {}) {
  const { owner, name } = parseRepository(repository)
  const temp = await mkdtemp(join(tmp, 'core-release-'))
  const cleanup = () => rm(temp, { recursive: true, force: true })
  const dir = join(temp, 'release')

  try {
    const downloadTemplate = download ?? (await import('giget')).downloadTemplate

    await downloadTemplate(`github:${owner}/${name}#${assertRef(ref)}`, {
      dir,
      force: true,
      offline: false,
      preferOffline: false,
    })
  } catch (error) {
    await cleanup()
    throw new Error(
      `The release ${ref} of ${owner}/${name} could not be downloaded: ${error.message}`,
      { cause: error }
    )
  }

  const entries = await readdir(dir).catch(() => [])

  if (!entries.includes('package.json')) {
    await cleanup()
    throw new Error(`The release ${ref} is malformed: it has no package.json at its root`)
  }

  return { dir, cleanup }
}

/**
 * A checkout of the template on this machine, used as the release instead of
 * a download: the template repository verifies its own changes with it, and a
 * project can update offline. The checkout is copied without its excluded
 * paths and its symbolic links, so the materialization never touches it.
 */
export async function copyRelease(source, { exclude = [], tmp = tmpdir() } = {}) {
  const root = resolve(source)
  const manifest = await readFile(join(root, 'package.json'), 'utf8').catch(() => null)

  if (manifest === null) {
    throw new Error(`The template at ${root} is malformed: it has no package.json at its root`)
  }

  const temp = await mkdtemp(join(tmp, 'core-release-'))
  const cleanup = () => rm(temp, { recursive: true, force: true })
  const dir = join(temp, 'release')

  try {
    for (const file of await listFiles(root, { exclude: [...DEFAULT_EXCLUDE, ...exclude] })) {
      await mkdir(dirname(join(dir, file)), { recursive: true })
      await copyFile(join(root, file), join(dir, file))
    }
  } catch (error) {
    await cleanup()
    throw new Error(`The template at ${root} could not be copied: ${error.message}`, {
      cause: error,
    })
  }

  return { dir, cleanup, version: JSON.parse(manifest).version }
}
