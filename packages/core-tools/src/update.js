import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { applyOperations, assertSafePath, matches, readOrNull, sha256 } from './files.js'
import {
  CORE_FILE,
  DEFAULT_PRESERVE,
  USER_MANIFESTS,
  listCoreFiles,
  readCore,
  readInstall,
  serializeMetadata,
} from './metadata.js'
import { copyRelease, downloadRelease, resolveTarget, targetFromInput } from './release.js'
import { materialize } from './transform.js'

/**
 * The sections of a manifest whose upstream entries are reported.
 */
const MANIFEST_SECTIONS = ['scripts', 'dependencies', 'devDependencies', 'imports', 'engines']

/**
 * Decides what an update does with one core path, from three checksums: the
 * one recorded at the last install or update, the one of the project and
 * the one of the materialized release (`null` when the file is absent).
 *
 * The answer is the action and the checksum to record afterwards (`null`
 * drops the record).
 */
export function classify({ recorded, local, upstream }) {
  if (recorded === null) {
    if (local === null) return { action: 'add', record: upstream }
    if (upstream === null) return { action: 'untracked', record: null }
    if (local === upstream) return { action: 'none', record: upstream }

    return {
      action: 'conflict',
      record: null,
      reason: 'a file of the project is where the release adds one',
    }
  }

  if (local === recorded) {
    if (upstream === null) return { action: 'delete', record: null }
    if (upstream === recorded) return { action: 'none', record: recorded }

    return { action: 'update', record: upstream }
  }

  /**
   * The project changed (or deleted) the file since it was recorded.
   */
  if (local === upstream) return { action: 'none', record: upstream }
  if (upstream === recorded) return { action: 'none', record: recorded }

  return {
    action: 'modified',
    record: recorded,
    reason: local === null ? 'deleted locally' : upstream === null ? 'deleted upstream' : null,
  }
}

/**
 * Reads a file of a tree when it exists, refusing a path that would leave
 * it.
 */
async function readTracked(root, path) {
  await assertSafePath(root, path)

  return readOrNull(join(root, path))
}

/**
 * Compares the project with a materialized release and plans the update:
 * the files to write and delete, the files kept and why, the checksums to
 * record, and the operations that apply it. Nothing is written here.
 *
 * The operations put `packages/core-tools` after every other file and
 * `.dash/core.json` last, so the tool replaces itself only once every other
 * decision is made and the metadata only moves when the files did.
 */
export async function planUpdate(root, releaseDir, core, options = {}) {
  const { conflicts = new Map(), exclude = [], version = core.version } = options
  const ownership = { core: core.core, userOwned: core.userOwned }

  const local = await listCoreFiles(root, { ...ownership, exclude })
  const upstream = await listCoreFiles(releaseDir, { ...ownership, symlinks: 'error' })
  const paths = [...new Set([...Object.keys(core.checksums), ...local, ...upstream])].sort()

  const plan = {
    updated: [],
    added: [],
    deleted: [],
    modified: [],
    conflicts: [],
    untracked: [],
    checksums: {},
    operations: [],
  }

  const tool = []
  const rest = []

  for (const path of paths) {
    const recorded = core.checksums[path] ?? null

    if (conflicts.has(path)) {
      plan.conflicts.push({ path, reason: conflicts.get(path) })
      if (recorded) plan.checksums[path] = recorded
      continue
    }

    const localBytes = await readTracked(root, path)
    const upstreamBytes = upstream.includes(path) ? await readFile(join(releaseDir, path)) : null

    const decision = classify({
      recorded,
      local: localBytes === null ? null : sha256(localBytes),
      upstream: upstreamBytes === null ? null : sha256(upstreamBytes),
    })

    if (decision.record) plan.checksums[path] = decision.record

    const operations = matches(path, DEFAULT_PRESERVE) ? tool : rest

    switch (decision.action) {
      case 'add':
      case 'update': {
        const { mode } = await stat(join(releaseDir, path))

        plan[decision.action === 'add' ? 'added' : 'updated'].push({ path })
        operations.push({ path, content: upstreamBytes, mode: mode & 0o777 })
        break
      }
      case 'delete':
        plan.deleted.push({ path })
        operations.push({ path, delete: true })
        break
      case 'modified':
        plan.modified.push({ path, reason: decision.reason })
        break
      case 'conflict':
        plan.conflicts.push({ path, reason: decision.reason })
        break
      case 'untracked':
        plan.untracked.push({ path })
        break
    }
  }

  const next = serializeMetadata({ ...core, version, checksums: plan.checksums })
  const current = await readOrNull(join(root, CORE_FILE), 'utf8')

  plan.operations = [...rest, ...tool]
  plan.metadataChanged = next !== current

  if (plan.operations.length > 0 || plan.metadataChanged) {
    plan.operations.push({ path: CORE_FILE, content: next })
  }

  plan.pending = plan.operations.length > 0 || plan.modified.length > 0 || plan.conflicts.length > 0

  return plan
}

/**
 * What a release changes in the manifests the project owns: every upstream
 * entry of a watched section that the project lacks or has with another
 * value. Entries the project added are its own business and are not listed.
 */
export async function manifestNotes(root, releaseDir) {
  const notes = []

  for (const file of USER_MANIFESTS) {
    const upstream = await readOrNull(join(releaseDir, file), 'utf8')
    const local = await readOrNull(join(root, file), 'utf8')

    if (upstream === null || local === null) continue

    let release
    let project

    try {
      release = JSON.parse(upstream)
      project = JSON.parse(local)
    } catch {
      continue
    }

    const changes = []

    for (const section of MANIFEST_SECTIONS) {
      for (const [key, value] of Object.entries(release[section] ?? {})) {
        const current = project[section]?.[key]

        if (JSON.stringify(current) === JSON.stringify(value)) continue

        changes.push(
          current === undefined
            ? `${section}.${key}: ${JSON.stringify(value)}`
            : `${section}.${key}: ${JSON.stringify(value)} (yours: ${JSON.stringify(current)})`
        )
      }
    }

    if (changes.length > 0) notes.push({ file, changes })
  }

  return notes
}

/**
 * The headings of the report. A preview says what would happen.
 */
const HEADINGS = {
  updated: ['Updated', 'Would update'],
  added: ['Added', 'Would add'],
  deleted: ['Deleted', 'Would delete'],
  modified: ['Modified locally, kept as they are', 'Modified locally, kept as they are'],
  conflicts: ['Conflicts, kept as they are', 'Conflicts, kept as they are'],
  untracked: [
    'Not tracked by the core, kept as they are',
    'Not tracked by the core, kept as they are',
  ],
}

/**
 * Prints the plan of an update in the words of the command that ran it.
 */
export function formatReport(plan, { mode, from, to, repository, notes = [] }) {
  const preview = mode !== 'update'
  const title = {
    'update': 'Core update',
    'dry-run': 'Core update preview (dry run)',
    'check': 'Core check',
  }[mode]
  const lines = [`${title}: ${from} -> ${to} (${repository})`]

  for (const [key, [done, planned]] of Object.entries(HEADINGS)) {
    const entries = plan[key]

    if (entries.length === 0) continue

    lines.push('', `${preview ? planned : done} (${entries.length}):`)

    for (const { path, reason } of entries) {
      lines.push(reason ? `  ${path} (${reason})` : `  ${path}`)
    }
  }

  if (notes.length > 0) {
    lines.push('', 'Manifest changes in the release (apply them by hand, then run npm install):')

    for (const { file, changes } of notes) {
      lines.push(`  ${file}`)
      for (const change of changes) lines.push(`    ${change}`)
    }
  }

  const files = plan.updated.length + plan.added.length + plan.deleted.length

  lines.push('')

  if (!plan.pending) {
    lines.push(`No changes: the core already matches ${to}.`)
  } else if (files === 0 && plan.modified.length === 0 && plan.conflicts.length === 0) {
    lines.push(
      preview ? 'Only the update metadata would change.' : 'Only the update metadata changed.'
    )
  }

  if (plan.modified.length > 0 || plan.conflicts.length > 0) {
    lines.push(
      'Some core files were kept as they are. Compare them with the release, merge by hand,',
      'and keep customizations in the feature folders so the next update can replace the core.'
    )
  }

  if (preview && plan.pending) {
    lines.push(
      mode === 'check' ? 'Nothing was written. Run core:update to apply.' : 'Nothing was written.'
    )
  }

  return lines.join('\n')
}

/**
 * Runs `update`, `check` or `update --dry-run` on a project.
 *
 * The release is resolved, downloaded into a temporary directory and
 * materialized there before a single project file is touched, so a network,
 * transformation or path failure leaves the project as it was. The temporary
 * directory is always removed.
 *
 * Exit code: `update` answers 1 when it kept a modified or conflicting file;
 * `check` and the dry run answer 1 when anything is pending.
 */
export async function runUpdate({ root, to, mode = 'update', log = console.log, ...seams }) {
  const core = await readCore(root)
  const install = await readInstall(root)
  let target
  let release

  if (seams.source) {
    release = await copyRelease(seams.source, { exclude: install.exclude, tmp: seams.tmp })
    target = to ? targetFromInput(to) : { version: release.version }
  } else {
    target = await resolveTarget(core.repository, to, { fetch: seams.fetch })
    release = await downloadRelease(core.repository, target.ref, seams)
  }

  try {
    const { conflicts } = await materialize(release.dir, install)
    const plan = await planUpdate(root, release.dir, core, {
      conflicts,
      exclude: install.exclude,
      version: target.version,
    })
    const notes = await manifestNotes(root, release.dir)

    if (mode === 'update' && plan.operations.length > 0) {
      await applyOperations(root, plan.operations, { write: seams.write })
    }

    log(
      formatReport(plan, {
        mode,
        from: core.version,
        to: target.version,
        repository: seams.source ?? core.repository,
        notes,
      })
    )

    if (mode === 'update') return plan.modified.length > 0 || plan.conflicts.length > 0 ? 1 : 0

    return plan.pending ? 1 : 0
  } finally {
    await release.cleanup()
  }
}
