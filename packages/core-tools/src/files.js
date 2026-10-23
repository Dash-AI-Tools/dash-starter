import { createHash, randomBytes } from 'node:crypto'
import {
  chmod,
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  rmdir,
  writeFile,
} from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'

/**
 * The directories that never belong to a project tree: dependencies, build
 * output and the state of the tools. They are skipped by every walk, so a
 * checksum never depends on what `npm install` or a build left behind.
 */
export const DEFAULT_EXCLUDE = [
  'node_modules/**',
  '**/node_modules/**',
  '.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.adonisjs/**',
  '**/.vitest/**',
  '**/.DS_Store',
]

const compiled = new Map()

/**
 * Turns a glob into a regular expression. Only `*`, `**` and `?` are
 * supported, the same subset the installer reads from `template.json`, so a
 * pattern means the same thing on both sides.
 */
export function globToRegExp(pattern) {
  let source = '^'

  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index]

    if (char === '*') {
      if (pattern[index + 1] === '*') {
        index++

        if (pattern[index + 1] === '/') {
          index++
          source += '(?:.*/)?'
        } else {
          source += '.*'
        }
      } else {
        source += '[^/]*'
      }

      continue
    }

    if (char === '?') {
      source += '[^/]'
      continue
    }

    source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  return new RegExp(`${source}$`)
}

function matchesOne(pattern, path) {
  if (!compiled.has(pattern)) compiled.set(pattern, globToRegExp(pattern))

  return compiled.get(pattern).test(path)
}

/**
 * The part of a glob before its first wildcard: every path it matches starts
 * with it.
 */
function literalPrefix(pattern) {
  const index = pattern.search(/[*?]/)

  return index === -1 ? pattern : pattern.slice(0, index)
}

/**
 * Whether a path matches one of the globs. The paths of the directories end
 * with a slash, so `node_modules/**` matches the directory itself.
 *
 * A pattern that starts with `!` takes a path back, as the installer reads it:
 * the path does not match, and neither does a directory on the way to it.
 */
export function matches(path, patterns = []) {
  const kept = patterns.filter((pattern) => pattern.startsWith('!')).map((p) => p.slice(1))
  const dropped = patterns.filter((pattern) => !pattern.startsWith('!'))

  if (!dropped.some((pattern) => matchesOne(pattern, path))) return false
  if (kept.some((pattern) => matchesOne(pattern, path))) return false
  if (path.endsWith('/')) return !kept.some((pattern) => literalPrefix(pattern).startsWith(path))

  return true
}

/**
 * Turns a path of the platform into the forward-slash form every manifest
 * uses.
 */
function toPosix(path) {
  return sep === '/' ? path : path.split(sep).join('/')
}

/**
 * Walks a directory and returns its files as sorted, relative paths.
 *
 * Symbolic links are never followed. A downloaded release is a trust
 * boundary, so `symlinks: 'error'` refuses a release that carries one instead
 * of silently skipping it.
 */
export async function listFiles(root, { exclude = [], symlinks = 'skip' } = {}) {
  const files = []

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true })

    for (const entry of entries) {
      const path = join(directory, entry.name)
      const relativePath = toPosix(relative(root, path))

      if (entry.isSymbolicLink()) {
        if (symlinks === 'error') {
          throw new Error(
            `The release contains a symbolic link at ${relativePath}: it is not followed`
          )
        }

        continue
      }

      if (entry.isDirectory()) {
        if (matches(`${relativePath}/`, exclude)) continue
        await walk(path)
        continue
      }

      if (!entry.isFile() || matches(relativePath, exclude)) continue

      files.push(relativePath)
    }
  }

  await walk(root)

  return files.sort()
}

/**
 * Refuses a path that could leave the directory it is relative to: an
 * absolute path, a `..` segment, a backslash or a NUL byte. Every path that
 * comes from a manifest or a release goes through here before it is used.
 */
export function assertRelative(path) {
  if (typeof path !== 'string' || path.length === 0) {
    throw new Error('Unsafe path: the path is empty')
  }

  if (
    isAbsolute(path) ||
    /^[A-Za-z]:/.test(path) ||
    path.includes('\\') ||
    path.includes('\0') ||
    path.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')
  ) {
    throw new Error(`Unsafe path: "${path}" resolves outside the project`)
  }

  return path
}

/**
 * Refuses a path that is not a plain relative path or that crosses a
 * symbolic link on its way: writing through a link would land outside the
 * project.
 */
export async function assertSafePath(root, path) {
  assertRelative(path)

  const segments = path.split('/')
  let current = root

  for (let index = 0; index < segments.length; index++) {
    current = join(current, segments[index])

    let stats

    try {
      stats = await lstat(current)
    } catch (error) {
      if (error.code === 'ENOENT') return path
      throw error
    }

    if (stats.isSymbolicLink()) {
      throw new Error(`Unsafe path: "${path}" goes through a symbolic link`)
    }

    if (index < segments.length - 1 && !stats.isDirectory()) {
      throw new Error(`Unsafe path: "${segments.slice(0, index + 1).join('/')}" is not a directory`)
    }
  }

  return path
}

/**
 * The checksum of some bytes, in the form the metadata records.
 */
export function sha256(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`
}

/**
 * Reads a file, or answers `null` when it does not exist.
 */
export async function readOrNull(path, encoding) {
  try {
    return await readFile(path, encoding)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

/**
 * Whether a path exists, without following a symbolic link.
 */
export async function exists(path) {
  try {
    await lstat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Whether some bytes hold text. Images and archives are never rewritten.
 */
export function isText(buffer) {
  return !buffer.includes(0)
}

/**
 * Removes the directories a deletion left empty, up to the root.
 */
async function removeEmptyParents(root, path) {
  let directory = dirname(path)

  while (directory !== root && directory.startsWith(root)) {
    try {
      await rmdir(directory)
    } catch {
      return
    }

    directory = dirname(directory)
  }
}

/**
 * Applies a list of writes and deletions as one transaction.
 *
 * Every write is first staged next to its target as a temporary file; only
 * when all of them are staged are they renamed into place, in the order of
 * the list, and the deletions run in that same order. A failure while staging
 * removes what was staged, so the project keeps every original file. A rename
 * within a directory is atomic, so no file is ever half written.
 *
 * `write` is the seam the tests use to fail in the middle of the staging.
 */
export async function applyOperations(root, operations, { write = writeFile } = {}) {
  for (const operation of operations) {
    await assertSafePath(root, operation.path)
  }

  const staged = new Map()
  const created = []

  try {
    for (const operation of operations) {
      if (operation.delete) continue

      const target = join(root, operation.path)
      const directory = await mkdir(dirname(target), { recursive: true })

      if (directory) created.push(directory)

      const temp = `${target}.${process.pid}-${randomBytes(4).toString('hex')}.tmp`

      staged.set(operation, temp)
      await write(temp, operation.content)

      const current = await lstat(target).catch(() => null)
      const mode = current ? current.mode & 0o777 : operation.mode

      if (mode !== undefined) await chmod(temp, mode)
    }
  } catch (error) {
    for (const temp of staged.values()) {
      await rm(temp, { force: true })
    }

    for (const directory of created.reverse()) {
      await rm(directory, { recursive: true, force: true })
    }

    throw error
  }

  for (const operation of operations) {
    const target = join(root, operation.path)

    if (operation.delete) {
      await rm(target, { force: true })
      await removeEmptyParents(root, target)
      continue
    }

    await rename(staged.get(operation), target)
  }
}
