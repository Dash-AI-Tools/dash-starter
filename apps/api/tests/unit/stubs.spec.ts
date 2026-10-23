import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, relative, sep } from 'node:path'
import { promisify } from 'node:util'
import type { ESLint } from 'eslint'
import * as prettier from 'prettier'

const run = promisify(execFile)

/**
 * Resolves a package of the project, hoisted to the root of the monorepo.
 */
const resolve = createRequire(import.meta.url).resolve

/**
 * The root of the API, the project the copy is made from.
 */
const APP_ROOT = app.makePath()

/**
 * Where the copies of the API live while a test runs.
 *
 * The build folder is the one place the typecheck, the lint, Prettier and git
 * of the real project all ignore, so a copy never breaks `tsc --noEmit` or
 * `eslint .` of the API while the test runs, nor after a crash that leaves it
 * behind. It sits inside the API, so the copy still resolves the hoisted
 * packages, the root Prettier configuration and `@adonisjs/tsconfig`.
 */
const SCRATCH_ROOT = join(APP_ROOT, 'build', 'stubs-check')

/**
 * The entries of the API a copy leaves out: the dependencies, the build, the
 * scratch files and the secrets. The environment of the test is inherited by
 * the commands, so the copy boots without a `.env` file.
 */
const SKIPPED_ENTRIES = new Set(['node_modules', 'build', 'tmp'])

/**
 * The folders that are generated, so the files a generator wrote are never
 * looked for in them.
 */
const GENERATED_FOLDERS = new Set(['.adonisjs', 'node_modules'])

/**
 * The prefix of every entity the generators create. No product names a
 * resource after it, so a generated file never collides with one the product
 * already has, whatever names the product uses.
 */
const PREFIX = 'stubcheck'

/**
 * The model the model, transformer and factory generators build. Its schema
 * class is added to the `database/schema.ts` of the copy only, so the model
 * typechecks without depending on a table of the product.
 */
const MODEL_SCHEMA = 'StubcheckSchema'

/**
 * A minimal schema class, shaped like the classes the migrations generate in
 * `database/schema.ts`, with the `id` the transformer picks.
 */
const MODEL_SCHEMA_SOURCE = `
export class ${MODEL_SCHEMA} extends BaseModel {
  static $columns = ['id'] as const
  $columns = ${MODEL_SCHEMA}.$columns
  @column({ isPrimary: true })
  declare id: number
}
`

/**
 * One command per variant of the stubs of `stubs/make/`, in an order where
 * every generated file finds what it imports: the transformer and the factory
 * need the model, and the model needs its schema class.
 */
const GENERATORS: string[][] = [
  ['make:controller', `${PREFIX}s`],
  ['make:controller', `${PREFIX}_resources`, '--resource'],
  ['make:controller', `${PREFIX}_apis`, '--api'],
  ['make:controller', `${PREFIX}_actions`, 'list_all', 'show_one'],
  ['make:model', PREFIX],
  ['make:transformer', PREFIX],
  ['make:factory', PREFIX],
  ['make:migration', `${PREFIX}s`],
  ['make:migration', `${PREFIX}s`, '--alter'],
  ['make:validator', PREFIX],
  ['make:validator', `${PREFIX}_resource`, '--resource'],
  ['make:service', PREFIX],
  ['make:test', PREFIX, '--suite=unit'],
  ['make:test', `${PREFIX}_flow`, '--suite=functional'],
  ['make:middleware', PREFIX, '--stack=named'],
  ['make:exception', PREFIX],
  ['make:event', `${PREFIX}_created`],
  ['make:listener', `${PREFIX}_audit`],
  ['make:listener', `notify_${PREFIX}`, `--event=${PREFIX}_noticed`],
  ['make:seeder', PREFIX],
]

/**
 * The files the generators above create, relative to the copy. The
 * migrations carry a timestamp, so they are matched by their ending.
 */
const CREATED_FILES: (string | RegExp)[] = [
  `app/controllers/${PREFIX}_controller.ts`,
  `app/controllers/${PREFIX}_resource_controller.ts`,
  `app/controllers/${PREFIX}_api_controller.ts`,
  `app/controllers/${PREFIX}_action_controller.ts`,
  `app/models/${PREFIX}.ts`,
  `app/transformers/${PREFIX}_transformer.ts`,
  `database/factories/${PREFIX}_factory.ts`,
  new RegExp(`^database/migrations/\\d+_create_${PREFIX}s_table\\.ts$`),
  new RegExp(`^database/migrations/\\d+_alter_${PREFIX}s_table\\.ts$`),
  `app/validators/${PREFIX}.ts`,
  `app/validators/${PREFIX}_resource.ts`,
  `app/services/${PREFIX}s.ts`,
  `tests/unit/${PREFIX}.spec.ts`,
  `tests/functional/${PREFIX}_flow.spec.ts`,
  `app/middleware/${PREFIX}_middleware.ts`,
  `app/exceptions/${PREFIX}_exception.ts`,
  `app/events/${PREFIX}_created.ts`,
  `app/listeners/${PREFIX}_audit.ts`,
  `app/events/${PREFIX}_noticed.ts`,
  `app/listeners/notify_${PREFIX}.ts`,
  `database/seeders/${PREFIX}_seeder.ts`,
]

/**
 * The files the generators above create or change: the named middleware is
 * registered in `start/kernel.ts`.
 */
const EXPECTED_FILES: (string | RegExp)[] = [...CREATED_FILES, 'start/kernel.ts']

/**
 * Whether a file of the copy matches an expected file.
 */
function matches(file: string, expected: string | RegExp): boolean {
  return typeof expected === 'string' ? file === expected : expected.test(file)
}

/**
 * The targets of the generators that already exist in the copy, so a
 * collision fails with its name instead of a generator silently skipping.
 */
async function existingTargets(root: string): Promise<string[]> {
  const sources = await fingerprints(root)
  const files = [...sources.keys()]
  const found = CREATED_FILES.filter((expected) =>
    files.some((file) => matches(file, expected))
  ).map(String)

  const kernel = await readFile(join(root, 'start/kernel.ts'), 'utf-8')
  if (new RegExp(`\\b${PREFIX}\\b`).test(kernel)) {
    found.push(`the named middleware ${PREFIX} of start/kernel.ts`)
  }

  const schema = await readFile(join(root, 'database/schema.ts'), 'utf-8')
  if (schema.includes(`class ${MODEL_SCHEMA} `)) {
    found.push(`the class ${MODEL_SCHEMA} of database/schema.ts`)
  }

  return found
}

/**
 * Adds the schema class of the model to the copy, after the classes the
 * migrations generated. Only the copy is written, never the real schema.
 */
async function addModelSchema(root: string) {
  const path = join(root, 'database/schema.ts')
  const schema = await readFile(path, 'utf-8')

  if (
    !/^import \{[^}]*\bBaseModel\b[^}]*\bcolumn\b[^}]*\} from '@adonisjs\/lucid\/orm'$/m.test(
      schema
    )
  ) {
    throw new Error('database/schema.ts of the copy does not import BaseModel and column')
  }

  await writeFile(path, `${schema.trimEnd()}\n${MODEL_SCHEMA_SOURCE}`)
}

/**
 * A stub that emits an import nobody uses, the mistake the lint has to catch.
 */
const LEAKY_STUB = `{{#var serviceFileName = string(entity.name).snakeCase().ext('.ts').toString()}}
{{{
  exports({
    to: app.servicesPath(entity.path, serviceFileName)
  })
}}}
import db from '@adonisjs/lucid/services/db'

export function leaky() {
  return 1
}

{{{ "\\n\\n" + exports({ finalNewline: true }) }}}
`

/**
 * Makes a copy of the API with its stubs, so the generators write into the
 * copy and never into the real application.
 */
async function copyApi(): Promise<string> {
  const target = join(SCRATCH_ROOT, `copy-${process.pid}-${Date.now()}`)
  await mkdir(target, { recursive: true })

  for (const entry of await readdir(APP_ROOT)) {
    if (SKIPPED_ENTRIES.has(entry) || entry.startsWith('.env')) {
      continue
    }

    await cp(join(APP_ROOT, entry), join(target, entry), { recursive: true })
  }

  return target
}

/**
 * The fingerprint of every source file of a copy, keyed by its path relative
 * to the copy, so the files a generator wrote can be told apart.
 */
async function fingerprints(root: string): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const entries = await readdir(root, { recursive: true, withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }

    const path = join(entry.parentPath, entry.name)
    const name = relative(root, path).split(sep).join('/')
    if (GENERATED_FOLDERS.has(name.split('/')[0])) {
      continue
    }

    result.set(
      name,
      createHash('sha1')
        .update(await readFile(path))
        .digest('hex')
    )
  }

  return result
}

/**
 * The files of the copy that are new or changed since the given fingerprint.
 */
async function writtenSince(root: string, before: Map<string, string>): Promise<string[]> {
  const after = await fingerprints(root)

  return [...after.entries()]
    .filter(([name, hash]) => before.get(name) !== hash)
    .map(([name]) => name)
    .sort()
}

/**
 * Runs an ace command in the copy, with the environment of the test.
 */
async function ace(root: string, args: string[]) {
  return run(process.execPath, ['ace.js', ...args], {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: '0' },
  })
}

/**
 * The files Prettier would rewrite, with the configuration of the project.
 */
async function unformatted(root: string, files: string[]): Promise<string[]> {
  const failures: string[] = []

  for (const file of files) {
    const path = join(root, file)
    const options = await prettier.resolveConfig(path)
    const source = await readFile(path, 'utf-8')

    if (!(await prettier.check(source, { ...options, filepath: path }))) {
      failures.push(file)
    }
  }

  return failures
}

/**
 * The lint errors of the files, with the configuration of the copy.
 *
 * The lint runs in its own process: the TypeScript parser of ESLint remembers
 * the root of the first project it lints, so linting the copy in the process
 * of the tests would break the lint of the real API in the next spec.
 */
async function lintErrors(root: string, files: string[]): Promise<string[]> {
  const eslint = join(dirname(resolve('eslint/package.json')), 'bin', 'eslint.js')
  const args = [eslint, '--format', 'json', ...files]

  /**
   * ESLint exits with an error when it reports one, and its report is still
   * the JSON on the standard output.
   */
  const output = await run(process.execPath, args, { cwd: root, maxBuffer: 64 * 1024 * 1024 })
    .then(({ stdout }) => stdout)
    .catch((error: { stdout?: string }) => {
      if (!error.stdout) {
        throw error
      }
      return error.stdout
    })

  const results: ESLint.LintResult[] = JSON.parse(output)

  return results.flatMap((result) =>
    result.messages
      .filter((message) => message.severity === 2)
      .map(
        (message) =>
          `${relative(root, result.filePath)}:${message.line} ${message.ruleId} ${message.message}`
      )
  )
}

/**
 * Typechecks the whole copy, the way `tsc --noEmit` checks the API.
 */
async function typecheck(root: string): Promise<string> {
  const tsc = resolve('typescript/bin/tsc')

  try {
    await run(process.execPath, [tsc, '--noEmit', '-p', root], { cwd: root })
    return ''
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: string; stderr?: string }
    return `${stdout ?? ''}${stderr ?? ''}` || String(error)
  }
}

test.group('The stubs of the generators', (group) => {
  let copy: string

  group.setup(async () => {
    /**
     * A copy left behind by a crashed run is removed first.
     */
    await rm(SCRATCH_ROOT, { recursive: true, force: true })
    copy = await copyApi()

    const existing = await existingTargets(copy)
    if (existing.length > 0) {
      throw new Error(
        `the copy of the API already has targets of the generators: ${existing.join(', ')}`
      )
    }
    await addModelSchema(copy)

    return () => rm(SCRATCH_ROOT, { recursive: true, force: true })
  })

  test('generates files that pass the format, the lint and the typecheck', async ({ assert }) => {
    const before = await fingerprints(copy)

    for (const args of GENERATORS) {
      const { stdout } = await ace(copy, args)

      assert.notInclude(stdout, 'skipped', `${args.join(' ')} did not write its file`)
    }

    const written = await writtenSince(copy, before)

    for (const expected of EXPECTED_FILES) {
      assert.isTrue(
        written.some((file) => matches(file, expected)),
        `no generator wrote ${expected}`
      )
    }
    assert.lengthOf(written, EXPECTED_FILES.length, `unexpected files: ${written.join(', ')}`)

    /**
     * The generators wrote into the copy, never into the real application.
     */
    assert.isFalse(existsSync(join(APP_ROOT, `app/controllers/${PREFIX}_controller.ts`)))

    assert.deepEqual(await unformatted(copy, written), [], 'Prettier would rewrite these files')
    assert.deepEqual(await lintErrors(copy, written), [], 'the lint reports these errors')
    assert.equal(await typecheck(copy), '', 'the typecheck reports these errors')
  }).timeout(300_000)

  test('fails the lint when a stub emits an unused import', async ({ assert }) => {
    await writeFile(join(copy, 'stubs/make/service/main.stub'), LEAKY_STUB)
    const before = await fingerprints(copy)

    await ace(copy, ['make:service', `${PREFIX}_leaky`])

    const written = await writtenSince(copy, before)
    assert.deepEqual(written, [`app/services/${PREFIX}_leaky.ts`])

    const errors = await lintErrors(copy, written)
    assert.isTrue(
      errors.some((error) => error.includes('@typescript-eslint/no-unused-vars')),
      `the lint did not report the unused import: ${errors.join('; ')}`
    )
  }).timeout(120_000)
})
