import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { assertRelative, assertSafePath, isText, listFiles, matches, readOrNull } from './files.js'
import { alignMarkdownTables } from './markdown.js'
import { DEFAULT_PRESERVE } from './metadata.js'
import { SHOWCASE, materializeShowcaseRemoval } from './showcase.js'

/**
 * The transformations of the capabilities a project removed. Each one is
 * replayed on every downloaded release, so an update never brings a removed
 * capability back.
 */
const CAPABILITIES = {
  [SHOWCASE]: materializeShowcaseRemoval,
}

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
 * This is a copy of `compileTokens` of the installer, on purpose: the
 * installer is removed from every generated project, so the updater cannot
 * import it. The materialization test runs both on one fixture, so the two
 * copies cannot drift apart silently.
 *
 * The tokens are sorted by length, so the longest one wins at every position,
 * and every token carries the boundaries that keep it from eating the words
 * that surround it: "dash" never matches the "dash" of "dashboard".
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
 * Removes a job of a GitHub Actions workflow, edited as text so the comments
 * and the order of the file survive.
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
 * Points the web app at the default locale of the product.
 */
export function setDefaultLocale(content, locale) {
  return content.replace(
    /export const DEFAULT_LOCALE: Locale = '[a-z]+'/,
    `export const DEFAULT_LOCALE: Locale = '${locale}'`
  )
}

/**
 * Sets the palette every visitor of the product sees.
 */
export function setDefaultPalette(content, palette) {
  return content.replace(
    /export const DEFAULT_PALETTE: PaletteId = '[a-z]+'/,
    `export const DEFAULT_PALETTE: PaletteId = '${palette}'`
  )
}

/**
 * Rewrites one text file of the release, when it exists.
 */
async function edit(dir, file, change) {
  await assertSafePath(dir, file)

  const path = join(dir, file)
  const content = await readOrNull(path, 'utf8')

  if (content === null) return

  const changed = change(content)

  if (changed !== content) await writeFile(path, changed)
}

/**
 * Removes the paths of a release that the manifest excludes, the way the
 * installer prunes a downloaded template.
 */
async function prune(root, exclude) {
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      const relativePath = relative(root, path).split('\\').join('/')

      if (entry.isDirectory() && !entry.isSymbolicLink()) {
        if (matches(`${relativePath}/`, exclude)) await rm(path, { recursive: true, force: true })
        else await walk(path)
        continue
      }

      if (matches(relativePath, exclude)) await rm(path, { force: true })
    }
  }

  await walk(root)
}

/**
 * Turns a downloaded release into the tree the installer would have
 * generated for this project, so it can be compared file by file.
 *
 * It replays, in the order of the installer, the update-side subset of its
 * pipeline: the excluded paths, the removed sections and lines, the identity
 * tokens (except on the preserved paths), the removed paths and workflow
 * jobs, the locale and the palette; then every removed capability. The
 * release is rewritten in place and never executed.
 *
 * It answers the files a removed capability could not be applied to, as a
 * map of path to reason: the update reports them instead of writing them.
 */
export async function materialize(releaseDir, install) {
  const exclude = install.exclude ?? []
  const preserve = install.preserve ?? DEFAULT_PRESERVE

  await prune(releaseDir, exclude)

  /**
   * A release with a symbolic link is refused before anything reads it.
   */
  await listFiles(releaseDir, { symlinks: 'error' })

  for (const section of install.removeSections ?? []) {
    await edit(releaseDir, section.file, (content) => removeSection(content, section.heading))
  }

  for (const line of install.removeLines ?? []) {
    await edit(releaseDir, line.file, (content) => removeLines(content, line.text))
  }

  const compiled = compileTokens(install.tokens ?? {}, install.values ?? {})

  for (const file of await listFiles(releaseDir, { exclude })) {
    if (matches(file, preserve)) continue

    const path = join(releaseDir, file)
    const buffer = await readFile(path)

    if (!isText(buffer)) continue

    const text = buffer.toString('utf8')
    let replaced = compiled.replace(text)

    if (replaced === text) continue

    /**
     * The installer aligns the Markdown tables the rebrand changed; the
     * update does the same so both write the same bytes.
     */
    if (file.endsWith('.md')) replaced = alignMarkdownTables(replaced)

    await writeFile(path, replaced)
  }

  for (const path of install.removePaths ?? []) {
    assertRelative(path)
    await rm(join(releaseDir, path), { recursive: true, force: true })
  }

  const jobs = install.removeWorkflowJobs ?? []

  if (jobs.length > 0) {
    const workflows = (await listFiles(releaseDir)).filter((file) =>
      file.startsWith('.github/workflows/')
    )

    for (const file of workflows) {
      await edit(releaseDir, file, (content) =>
        jobs.reduce((current, job) => removeWorkflowJob(current, job), content)
      )
    }
  }

  if (install.locale) {
    await edit(releaseDir, 'apps/web/src/lib/i18n.tsx', (content) =>
      setDefaultLocale(content, install.locale)
    )
  }

  if (install.palette) {
    await edit(releaseDir, 'apps/web/src/lib/palettes.ts', (content) =>
      setDefaultPalette(content, install.palette)
    )
  }

  const conflicts = new Map()

  for (const capability of install.removedCapabilities ?? []) {
    const remove = CAPABILITIES[capability]

    if (!remove) throw new Error(`Unknown removed capability "${capability}" in .dash/install.json`)

    for (const [path, reason] of await remove(releaseDir)) conflicts.set(path, reason)
  }

  return { conflicts }
}
