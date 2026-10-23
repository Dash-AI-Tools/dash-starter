import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { listFiles } from './files.js'
import { isExcluded } from './glob.js'

/**
 * The version of the schema of the metadata, read by the core tools of the
 * generated project.
 */
export const SCHEMA_VERSION = 1

/**
 * The directory of the metadata. It is written after the replacements, so its
 * name is never rebranded.
 */
export const METADATA_DIR = '.dash'

/**
 * The checksum of a file, in the form the core tools compare.
 */
export function sha256(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`
}

/**
 * The checksums of every core file of a project: the files of the `core`
 * globs that are not owned by the product and not excluded from the template.
 */
export async function coreChecksums(root, { core, userOwned, exclude = [] }) {
  const files = await listFiles(root, { exclude })
  const checksums = {}

  for (const file of files.sort()) {
    if (!isExcluded(file, core) || isExcluded(file, userOwned)) continue

    checksums[file] = sha256(await readFile(join(root, file)))
  }

  return checksums
}

/**
 * The record of how the project was generated: the identity and every
 * transformation of the template, so a core update can replay them on a
 * newer release. It holds no secret: the keys live in the env files only.
 */
export function installRecord({ manifest, identity, values, version }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    templateVersion: version,
    identity: {
      name: identity.name,
      slug: identity.slug,
      description: identity.description,
      email: identity.email,
    },
    tokens: manifest.tokens,
    values,
    exclude: manifest.exclude,
    preserve: manifest.preserve ?? [],
    removePaths: manifest.removePaths,
    removeSections: manifest.removeSections,
    removeLines: manifest.removeLines,
    removeWorkflowJobs: manifest.removeWorkflowJobs,
    locale: identity.locale,
    palette: identity.palette,
    removedCapabilities: [],
  }
}

/**
 * Writes `.dash/install.json` and `.dash/core.json`. It runs once the project
 * has its final bytes, so the checksums describe the files the developer
 * receives.
 */
export async function writeMetadata(root, { manifest, identity, values, version, repository }) {
  const checksums = await coreChecksums(root, {
    core: manifest.core,
    userOwned: manifest.userOwned,
    exclude: manifest.exclude,
  })

  const core = {
    schemaVersion: SCHEMA_VERSION,
    repository,
    version,
    core: manifest.core,
    userOwned: manifest.userOwned,
    checksums,
  }

  await mkdir(join(root, METADATA_DIR), { recursive: true })
  await writeFile(
    join(root, METADATA_DIR, 'install.json'),
    `${JSON.stringify(installRecord({ manifest, identity, values, version }), null, 2)}\n`
  )
  await writeFile(join(root, METADATA_DIR, 'core.json'), `${JSON.stringify(core, null, 2)}\n`)

  return { checksums }
}
