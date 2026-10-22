import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { listFiles } from './files.js'

/**
 * Escapes the characters of a literal that have a meaning in a regular
 * expression.
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Compiles the tokens of the manifest into a single regular expression.
 *
 * The tokens are sorted by length, so the longest one wins at every position,
 * and every token carries the boundaries that keep it from eating the words
 * that surround it: "dash" never matches the "dash" of "dashboard", but it
 * does match the "dash" of "dash-starter", because the longer token claims
 * that position first.
 */
export function compileTokens(tokens, values) {
  const entries = Object.entries(tokens)
    .filter(([literal]) => literal.length > 0)
    .sort(([left], [right]) => right.length - left.length)

  const sources = new Map(entries.map(([literal, source]) => [literal, source]))

  const pattern = entries
    .map(([literal]) => {
      const before = /[A-Za-z0-9_]/.test(literal[0]) ? '(?<![A-Za-z0-9_])' : ''
      const after = /[A-Za-z0-9]/.test(literal.at(-1)) ? '(?![A-Za-z0-9_])' : ''

      return `${before}${escapeRegExp(literal)}${after}`
    })
    .join('|')

  const regex = new RegExp(pattern, 'gi')

  return {
    regex,

    /**
     * Replaces every token of a text.
     */
    replace(text) {
      return text.replace(regex, (match) => {
        const source = sources.get(match) ?? sources.get(match.toLowerCase())
        const value = source ? values[source] : undefined

        return value === undefined ? match : value
      })
    },
  }
}

/**
 * Rewrites every text file of a project with the identity of the product.
 */
export async function applyReplacements(root, { tokens, values, exclude = [] }) {
  const compiled = compileTokens(tokens, values)
  const files = await listFiles(root, { exclude })
  let changed = 0

  for (const file of files) {
    const path = join(root, file)
    const buffer = await readFile(path)

    /**
     * The images and the archives are copied untouched.
     */
    if (buffer.includes(0)) continue

    const text = buffer.toString('utf8')
    const replaced = compiled.replace(text)

    if (replaced === text) continue

    await writeFile(path, replaced)
    changed++
  }

  return changed
}

/**
 * Removes a job of a GitHub Actions workflow. The workflow is edited as text
 * so the comments and the order of the file survive.
 */
export function removeWorkflowJob(content, job) {
  const lines = content.split('\n')
  const start = lines.indexOf(`  ${job}:`)

  if (start === -1) return content

  let end = start + 1

  while (end < lines.length && (lines[end] === '' || lines[end].startsWith('    '))) {
    end++
  }

  return [...lines.slice(0, start), ...lines.slice(end)].join('\n')
}

/**
 * Removes the jobs of the template that do not belong to a generated project,
 * such as the job that tests the installer itself.
 */
export async function removeWorkflowJobs(root, jobs) {
  if (jobs.length === 0) return

  const files = await listFiles(root, { exclude: [] })
  const workflows = files.filter((file) => file.startsWith('.github/workflows/'))

  for (const file of workflows) {
    const path = join(root, file)
    const original = await readFile(path, 'utf8')
    let content = original

    for (const job of jobs) {
      content = removeWorkflowJob(content, job)
    }

    if (content !== original) {
      await writeFile(path, content)
    }
  }
}

/**
 * Removes the directories of the template that do not belong to a generated
 * project: the installer itself and the history of the change.
 */
export async function removePaths(root, paths) {
  for (const path of paths) {
    await rm(join(root, path), { recursive: true, force: true })
  }
}

/**
 * Removes a section of a document: the heading and everything until the next
 * heading of the first or the second level.
 */
export function removeSection(content, heading) {
  const lines = content.split('\n')
  const start = lines.indexOf(heading)

  if (start === -1) return content

  let end = start + 1

  while (end < lines.length && !/^#{1,2} /.test(lines[end])) {
    end++
  }

  return [...lines.slice(0, start), ...lines.slice(end)].join('\n')
}

/**
 * Removes the lines of a document that contain a piece of text.
 */
export function removeLines(content, text) {
  return content
    .split('\n')
    .filter((line) => !line.includes(text))
    .join('\n')
}

/**
 * Takes the parts of the template out of a generated project: the sections
 * and the lines that talk about the installer.
 */
export async function applyRemovals(root, { sections = [], lines = [] } = {}) {
  for (const section of sections) {
    const path = join(root, section.file)
    const content = await readFile(path, 'utf8')

    await writeFile(path, removeSection(content, section.heading))
  }

  for (const line of lines) {
    const path = join(root, line.file)
    const content = await readFile(path, 'utf8')

    await writeFile(path, removeLines(content, line.text))
  }
}
