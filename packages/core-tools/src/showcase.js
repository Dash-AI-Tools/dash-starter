import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  DEFAULT_EXCLUDE,
  applyOperations,
  assertSafePath,
  exists,
  listFiles,
  matches,
  readOrNull,
  sha256,
} from './files.js'
import {
  CORE_FILE,
  INSTALL_FILE,
  METADATA_DIR,
  readCore,
  readInstall,
  serializeMetadata,
} from './metadata.js'

/**
 * The name the removal is recorded under in `removedCapabilities`.
 */
export const SHOWCASE = 'showcase'

/**
 * The files that only exist for the showcase. They are deleted whole.
 */
export const SHOWCASE_FILES = [
  'apps/web/src/pages/ShowcasePage.tsx',
  'apps/web/src/pages/showcase.test.tsx',
  'apps/web/src/pages/showcase.build.test.ts',
  'apps/web/src/locales/en/showcase.ts',
  'apps/web/src/locales/es/showcase.ts',
]

/**
 * The files that keep the showcase between `// showcase:start` and
 * `// showcase:end`: the dev route block of the router.
 */
export const SHOWCASE_BLOCK_FILES = ['apps/web/src/main.tsx']

/**
 * The files whose showcase lines end with `// showcase:line`: the import, the
 * catalog entry and the spread of the locale indexes.
 */
export const SHOWCASE_LINE_FILES = [
  'apps/web/src/locales/en/index.ts',
  'apps/web/src/locales/es/index.ts',
]

/**
 * The paths the removal never deletes, whatever the lists above say: the
 * product pages, the shell, the patterns, the UI kit and the tools.
 */
export const PROTECTED = [
  'apps/web/src/pages/Home.tsx',
  'apps/web/src/pages/DashboardPage.tsx',
  'apps/web/src/layouts/AppLayout.tsx',
  'apps/web/src/layouts/PublicLayout.tsx',
  'apps/web/src/components/app/**',
  'apps/web/src/components/patterns/**',
  'packages/ui/**',
  'packages/core-tools/**',
]

const START = '// showcase:start'
const END = '// showcase:end'
const LINE = /\/\/ showcase:line\s*$/

/**
 * Removes every `// showcase:start` … `// showcase:end` block, markers
 * included. When the block sat between two blank lines one of them goes too,
 * so the file stays formatted.
 */
export function stripShowcaseBlocks(content) {
  const lines = content.split('\n')
  const output = []
  let count = 0
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trim()

    if (line === END) return { content, count: 0, error: `"${END}" comes before "${START}"` }

    if (line !== START) {
      output.push(lines[index])
      index++
      continue
    }

    const end = lines.findIndex(
      (candidate, position) => position > index && candidate.trim() === END
    )

    if (end === -1) return { content, count: 0, error: `"${START}" has no "${END}"` }

    count++
    index = end + 1

    if (output.at(-1)?.trim() === '' && (lines[index] ?? '').trim() === '') index++
  }

  return { content: output.join('\n'), count }
}

/**
 * Removes every line that ends with `// showcase:line`.
 */
export function stripShowcaseLines(content) {
  const lines = content.split('\n')
  const kept = lines.filter((line) => !LINE.test(line))

  return { content: kept.join('\n'), count: lines.length - kept.length }
}

/**
 * Whether a source still carries a removal marker.
 */
function hasMarkers(content) {
  return content.includes(START) || content.includes(END) || /\/\/ showcase:line/.test(content)
}

/**
 * Whether a source still reaches the showcase: its page, its catalog or its
 * route.
 */
export function referencesShowcase(content) {
  return /\bShowcasePage\b|['"`][^'"`\n]*\/showcase['"`]|dev\/components/.test(content)
}

/**
 * Strips the showcase from one marked file, or explains why it cannot.
 */
function stripFile(path, content) {
  const block = SHOWCASE_BLOCK_FILES.includes(path)
  const result = block ? stripShowcaseBlocks(content) : stripShowcaseLines(content)
  const marker = block ? `"${START}" … "${END}"` : '"// showcase:line"'

  if (result.error) return { error: `${path}: ${result.error}` }
  if (result.count === 0) return { error: `${path} has no ${marker} marker` }

  return { content: result.content }
}

/**
 * Applies the removal to a downloaded release, before it is compared with
 * the project. A marked file whose markers are gone upstream, but that still
 * reaches the showcase, is reported as a conflict and left out of the update
 * instead of bringing the showcase back.
 */
export async function materializeShowcaseRemoval(dir) {
  const conflicts = new Map()

  for (const file of SHOWCASE_FILES) {
    await rm(join(dir, file), { force: true })
  }

  for (const file of [...SHOWCASE_BLOCK_FILES, ...SHOWCASE_LINE_FILES]) {
    const content = await readOrNull(join(dir, file), 'utf8')

    if (content === null || (!hasMarkers(content) && !referencesShowcase(content))) continue

    const result = stripFile(file, content)

    if (result.error || referencesShowcase(result.content)) {
      conflicts.set(file, 'the release reaches the showcase outside its removal markers')
      continue
    }

    await writeFile(join(dir, file), result.content)
  }

  return conflicts
}

/**
 * The sources of the web app that would still reach the showcase once the
 * planned edits and deletions are applied.
 */
async function strayReferences(root, edits) {
  const sources = await listFiles(join(root, 'apps/web/src'), { exclude: DEFAULT_EXCLUDE })
  const stray = []

  for (const source of sources) {
    const path = `apps/web/src/${source}`

    if (SHOWCASE_FILES.includes(path) || !/\.(?:[cm]?[jt]sx?)$/.test(path)) continue

    const content = edits.get(path) ?? (await readFile(join(root, path), 'utf8'))

    if (referencesShowcase(content)) stray.push(path)
  }

  return stray
}

/**
 * Removes the in-app showcase: its page, tests, catalogs, route and catalog
 * registrations.
 *
 * Everything is checked before anything is written. A missing marker or a
 * reference to the showcase outside the known files aborts with no change;
 * a project without the showcase is a successful no-op. In a generated
 * project the removal is recorded in `.dash/` so an update never brings it
 * back.
 */
export async function removeShowcase(root, { log = console.log } = {}) {
  const present = []

  for (const file of SHOWCASE_FILES) {
    if (await exists(join(root, file))) present.push(file)
  }

  const originals = new Map()

  for (const file of [...SHOWCASE_BLOCK_FILES, ...SHOWCASE_LINE_FILES]) {
    originals.set(file, await readOrNull(join(root, file), 'utf8'))
  }

  const marked = [...originals.values()].some(
    (content) => content !== null && (hasMarkers(content) || referencesShowcase(content))
  )

  if (present.length === 0 && !marked) {
    log('The showcase is already removed: nothing changed.')
    return 0
  }

  const errors = []
  const edits = new Map()

  for (const [file, content] of originals) {
    if (content === null) {
      errors.push(`${file} was not found`)
      continue
    }

    /**
     * A file that no longer reaches the showcase and has no marker left is
     * already clean.
     */
    if (!hasMarkers(content) && !referencesShowcase(content)) continue

    const result = stripFile(file, content)

    if (result.error) errors.push(result.error)
    else edits.set(file, result.content)
  }

  for (const file of present) {
    if (matches(file, PROTECTED)) errors.push(`${file} is protected and is never deleted`)
  }

  if (errors.length === 0) {
    for (const path of await strayReferences(root, edits)) {
      errors.push(`${path} still references the showcase: remove that reference first`)
    }
  }

  for (const file of [...present, ...edits.keys()]) {
    try {
      await assertSafePath(root, file)
    } catch (error) {
      errors.push(error.message)
    }
  }

  if (errors.length > 0) {
    log('The showcase was not removed:')
    for (const error of errors) log(`  ${error}`)
    log('Nothing was changed.')
    return 1
  }

  const operations = [
    ...[...edits].map(([path, content]) => ({ path, content })),
    ...present.map((path) => ({ path, delete: true })),
  ]

  const recorded = await exists(join(root, METADATA_DIR))

  if (recorded) {
    /**
     * Both files are validated before anything is written: a corrupt
     * manifest aborts with the project untouched. The install file is
     * rewritten from its raw content, so no default is added to it.
     */
    await readInstall(root)
    const core = await readCore(root)
    const install = JSON.parse(await readFile(join(root, INSTALL_FILE), 'utf8'))

    const capabilities = new Set(install.removedCapabilities ?? [])
    capabilities.add(SHOWCASE)
    install.removedCapabilities = [...capabilities]

    /**
     * An edited file becomes the new baseline only when it was untouched: a
     * file the team had already changed keeps its old checksum, so the next
     * update still reports it instead of overwriting it.
     */
    for (const [path, content] of edits) {
      if (core.checksums[path] && core.checksums[path] === sha256(originals.get(path))) {
        core.checksums[path] = sha256(content)
      }
    }

    for (const path of present) delete core.checksums[path]

    operations.push(
      { path: INSTALL_FILE, content: serializeMetadata(install) },
      { path: CORE_FILE, content: serializeMetadata(core) }
    )
  }

  await applyOperations(root, operations)

  log('The showcase was removed:')
  for (const path of present) log(`  deleted  ${path}`)
  for (const path of edits.keys()) log(`  edited   ${path}`)

  if (recorded) {
    log(`Recorded "${SHOWCASE}" in ${INSTALL_FILE} and refreshed the checksums in ${CORE_FILE}.`)
  } else {
    log(`No update metadata (${METADATA_DIR}/) was found, so the removal was not recorded.`)
  }

  return 0
}
