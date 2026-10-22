import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { isExcluded } from './glob.js'

/**
 * Walks a directory and returns the files that are not excluded, as paths
 * relative to the root.
 */
export async function listFiles(root, { exclude = [] } = {}) {
  const files = []

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true })

    for (const entry of entries) {
      const path = join(directory, entry.name)
      const relativePath = relative(root, path)

      if (entry.isDirectory()) {
        if (isExcluded(`${relativePath}/`, exclude)) continue
        await walk(path)
        continue
      }

      if (isExcluded(relativePath, exclude)) continue

      files.push(relativePath)
    }
  }

  await walk(root)

  return files
}

/**
 * Whether a file holds text. The installer only rewrites the text files, so
 * the images and the archives of the template survive untouched.
 */
export function isText(content) {
  return !content.includes(0)
}

/**
 * Reads a file and answers its content and whether it is text.
 */
export async function readFileSafe(path) {
  const buffer = await readFile(path)

  return { buffer, isText: isText(buffer) }
}

/**
 * Writes a file, creating the directories of its path.
 */
export async function writeFileSafe(path, content) {
  await writeFile(path, content)
}

/**
 * Whether a path exists.
 */
export async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}
