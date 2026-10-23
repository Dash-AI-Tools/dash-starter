import { readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

import { DEFAULT_EXCLUDE, assertRelative, listFiles, matches, readOrNull, sha256 } from './files.js'

/**
 * The version of the shape of both metadata files. A file written by a newer
 * tool is refused instead of being misread.
 */
export const SCHEMA_VERSION = 1

/**
 * The metadata directory. It is always `.dash`, whatever the product is
 * called: the token map of the installer never reaches the tools, so the
 * name cannot drift between a project and its updater.
 */
export const METADATA_DIR = '.dash'
export const INSTALL_FILE = `${METADATA_DIR}/install.json`
export const CORE_FILE = `${METADATA_DIR}/core.json`

/**
 * The paths the template owns. Their checksums are recorded, and an update
 * replaces them while they are untouched.
 */
export const DEFAULT_CORE = [
  'apps/api/app/**',
  'apps/api/start/**',
  'apps/api/config/**',
  'apps/api/database/**',
  'apps/api/resources/**',
  'apps/api/tests/unit/**',
  'apps/api/tests/functional/**',
  'apps/web/src/**',
  'apps/web/vite.config.ts',
  'apps/web/tsconfig*.json',
  'apps/web/index.html',
  'packages/ui/**',
  'packages/core-tools/**',
]

/**
 * The paths the product owns. They win over the core globs, so a feature
 * inside `apps/web/src/features` is never replaced.
 */
export const DEFAULT_USER_OWNED = [
  'apps/api/app/features/**',
  'apps/api/tests/functional/features/**',
  'apps/web/src/features/**',
  'packages/ui/src/custom/**',
  '.env*',
  '**/.env*',
  'openspec/**',
  'docs/**',
  'README.md',
  'package.json',
  'apps/api/package.json',
  'apps/web/package.json',
  'package-lock.json',
  '**/package-lock.json',
  '**/Dockerfile*',
  'docker-compose*.yml',
  '.github/**',
]

/**
 * The paths left out of the token replacement. The tools read and write
 * `.dash/` and talk about the template by name, so rebranding their source
 * would break them.
 */
export const DEFAULT_PRESERVE = ['packages/core-tools/**']

/**
 * The manifests the product owns. An update never writes them, it reports
 * what the release changed in them.
 */
export const USER_MANIFESTS = ['package.json', 'apps/api/package.json', 'apps/web/package.json']

/**
 * Whether a path belongs to the core: it matches a core glob and no
 * user-owned one.
 */
export function isCorePath(path, { core = DEFAULT_CORE, userOwned = DEFAULT_USER_OWNED } = {}) {
  return matches(path, core) && !matches(path, userOwned)
}

/**
 * The core files of a tree, as sorted relative paths.
 */
export async function listCoreFiles(root, { core, userOwned, exclude = [], symlinks } = {}) {
  const files = await listFiles(root, { exclude: [...DEFAULT_EXCLUDE, ...exclude], symlinks })

  return files.filter((file) => isCorePath(file, { core, userOwned }))
}

/**
 * The checksum of every core file of a tree. The installer records them on
 * the final bytes of a generated project, and the updater compares against
 * them.
 */
export async function computeChecksums(root, options = {}) {
  const checksums = {}

  for (const file of await listCoreFiles(root, options)) {
    checksums[file] = sha256(await readFile(join(root, file)))
  }

  return checksums
}

/**
 * Reads a metadata file. A missing file and a corrupt one get their own
 * message, because they call for different fixes.
 */
async function readMetadata(root, file) {
  const content = await readOrNull(join(root, file), 'utf8')

  if (content === null) {
    throw new Error(
      `${file} was not found. Only projects generated with the update metadata can run this command`
    )
  }

  let data

  try {
    data = JSON.parse(content)
  } catch {
    throw new Error(`${file} is corrupt: it is not valid JSON`)
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${file} is corrupt: it is not an object`)
  }

  if (data.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `${file} has schema version ${data.schemaVersion}, this tool reads version ${SCHEMA_VERSION}`
    )
  }

  return data
}

/**
 * Refuses a field that does not have the expected shape.
 */
function expect(file, condition, field) {
  if (!condition) throw new Error(`${file} is corrupt: "${field}" is missing or invalid`)
}

const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

/**
 * Reads `.dash/install.json`: the identity and the transformations the
 * installer applied, which the updater replays on every release.
 */
export async function readInstall(root) {
  const data = await readMetadata(root, INSTALL_FILE)

  expect(INSTALL_FILE, isObject(data.tokens), 'tokens')
  expect(INSTALL_FILE, isObject(data.values), 'values')

  for (const field of ['exclude', 'preserve', 'removePaths', 'removeWorkflowJobs']) {
    expect(INSTALL_FILE, data[field] === undefined || isStringArray(data[field]), field)
  }

  for (const field of ['removeSections', 'removeLines', 'removedCapabilities']) {
    expect(INSTALL_FILE, data[field] === undefined || Array.isArray(data[field]), field)
  }

  return {
    ...data,
    identity: data.identity ?? {},
    exclude: data.exclude ?? [],
    preserve: data.preserve ?? DEFAULT_PRESERVE,
    removePaths: data.removePaths ?? [],
    removeSections: data.removeSections ?? [],
    removeLines: data.removeLines ?? [],
    removeWorkflowJobs: data.removeWorkflowJobs ?? [],
    locale: data.locale ?? data.identity?.locale,
    palette: data.palette ?? data.identity?.palette,
    removedCapabilities: data.removedCapabilities ?? [],
  }
}

/**
 * Reads `.dash/core.json`: the upstream repository, the installed version,
 * the ownership globs and the checksums of the core files.
 */
export async function readCore(root) {
  const data = await readMetadata(root, CORE_FILE)

  expect(CORE_FILE, typeof data.repository === 'string', 'repository')
  expect(CORE_FILE, typeof data.version === 'string', 'version')
  expect(CORE_FILE, isStringArray(data.core), 'core')
  expect(CORE_FILE, isStringArray(data.userOwned), 'userOwned')
  expect(CORE_FILE, isObject(data.checksums), 'checksums')

  for (const [path, checksum] of Object.entries(data.checksums)) {
    assertRelative(path)
    expect(CORE_FILE, /^sha256:[0-9a-f]{64}$/.test(checksum), `checksums.${path}`)
  }

  return data
}

/**
 * The bytes of a metadata file. The checksums are sorted, so two runs that
 * reach the same state write the same file.
 */
export function serializeMetadata(data) {
  const output = { ...data }

  if (data.checksums) {
    output.checksums = Object.fromEntries(
      Object.entries(data.checksums).sort(([left], [right]) => (left < right ? -1 : 1))
    )
  }

  return `${JSON.stringify(output, null, 2)}\n`
}

/**
 * Whether a directory exists.
 */
async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

/**
 * Finds the root of the project from a directory inside it: the closest
 * directory with the `.dash` metadata, or else the closest one whose
 * `package.json` declares the workspaces (the template checkout has no
 * metadata).
 */
export async function findProjectRoot(start = process.cwd()) {
  let directory = resolve(start)

  while (true) {
    if (await isDirectory(join(directory, METADATA_DIR))) return directory

    const manifest = await readOrNull(join(directory, 'package.json'), 'utf8')

    try {
      if (manifest && JSON.parse(manifest).workspaces) return directory
    } catch {
      // A broken manifest is not a root; keep looking above it.
    }

    const parent = dirname(directory)

    if (parent === directory) break
    directory = parent
  }

  throw new Error('The project root was not found: run the command inside the project')
}
