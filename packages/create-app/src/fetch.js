import { copyFile, mkdir, readdir, rm } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

import { isExcluded } from './glob.js'
import { listFiles } from './files.js'

/**
 * The repository of the template. The environment variable exists so a fork
 * can publish its own installer without touching the code.
 */
export const DEFAULT_TEMPLATE_REPO = 'github:Dash-AI-Tools/dash-starter'

/**
 * Whether a template is a directory of this machine and not a remote one. A
 * remote template is an address or a source of a provider, like
 * "github:owner/repository".
 */
export function isLocalTemplate(template) {
  if (/^https?:\/\//i.test(template)) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(template)) return false

  return true
}

/**
 * The source of the template: the flag when it is given, the release of the
 * template that matches the version of the installer otherwise.
 */
export function templateSource(template, version, repo = DEFAULT_TEMPLATE_REPO) {
  if (template) return template

  return `${repo}#v${version}`
}

/**
 * Removes the files and the directories of a project that the manifest
 * excludes. The templates that arrive as a tarball carry everything the
 * repository has, so the installer prunes what does not belong to a product.
 */
export async function prune(root, { exclude = [] } = {}) {
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true })

    for (const entry of entries) {
      const path = join(directory, entry.name)
      const relativePath = relative(root, path)

      if (entry.isDirectory()) {
        if (isExcluded(`${relativePath}/`, exclude)) {
          await rm(path, { recursive: true, force: true })
          continue
        }

        await walk(path)
        continue
      }

      if (isExcluded(relativePath, exclude)) {
        await rm(path, { force: true })
      }
    }
  }

  await walk(root)
}

/**
 * Copies a local template into the target directory, without the files the
 * manifest excludes.
 */
export async function copyTemplate(source, target, { exclude = [] } = []) {
  const files = await listFiles(source, { exclude })

  for (const file of files) {
    const path = join(target, file)

    await mkdir(dirname(path), { recursive: true })
    await copyFile(join(source, file), path)
  }

  return target
}

/**
 * Fetches the template into the target directory: a local directory is
 * copied, a remote one is downloaded with giget.
 */
export async function fetchTemplate({ template, version, target, exclude = [], repo, download }) {
  if (template && isLocalTemplate(template)) {
    const source = resolve(template)

    /**
     * A project generated inside the template would copy itself.
     */
    const inside = relative(source, resolve(target))
    const patterns = inside && !inside.startsWith('..') ? [...exclude, `${inside}/`] : exclude

    return copyTemplate(source, target, { exclude: patterns })
  }

  await mkdir(target, { recursive: true })

  const downloadTemplate = download ?? (await import('giget')).downloadTemplate
  const { dir } = await downloadTemplate(templateSource(template, version, repo), {
    dir: target,
    force: true,
  })

  await prune(dir, { exclude })

  return dir
}
