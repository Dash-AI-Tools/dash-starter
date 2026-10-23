import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { run } from '../src/index.js'
import { listFiles } from '../src/files.js'
import { isExcluded } from '../src/glob.js'
import { sha256 } from '../src/metadata.js'
import { createTemplate, manifest, shipped } from './fixture.js'

test('a project is generated from a local template', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')

  const commands = []

  const code = await run(
    [
      target,
      '--template',
      template,
      '--name',
      'Acme AI',
      '--slug',
      'acme-ai',
      '--email',
      'hi@acme.test',
      '--locale',
      'es',
      '--palette',
      'forest',
      '--yes',
      '--no-install',
      '--no-boot',
      '--no-git',
    ],
    {
      manifest,
      version: '0.1.0',
      log: () => {},
      run: async (command, args, options) => {
        commands.push({ command, args, cwd: options?.cwd })
        return { code: 0, output: '', error: null }
      },
    }
  )

  assert.equal(code, 0)
  assert.deepEqual(commands, [])

  const readme = await readFile(join(target, 'README.md'), 'utf8')

  assert.equal(readme.includes('Dash'), false)
  assert.equal(readme.includes('dash-starter'), false)
  assert.equal(readme.includes('packages/create-app'), false)
  assert.equal(readme.includes('## The installer'), false)
  assert.equal(readme.includes('## Deployment'), true)
  assert.equal(readme.includes('# Acme AI'), true)

  const packageJson = await readFile(join(target, 'package.json'), 'utf8')

  assert.equal(packageJson.includes('"name": "acme-ai"'), true)

  const apiPackage = await readFile(join(target, 'apps/api/package.json'), 'utf8')

  assert.equal(apiPackage.includes('"@acme-ai/api"'), true)

  const workflow = await readFile(join(target, '.github/workflows/ci.yml'), 'utf8')

  assert.equal(workflow.includes('installer'), false)
  assert.equal(workflow.includes('npm run lint'), true)

  const locale = await readFile(join(target, 'apps/web/src/lib/i18n.tsx'), 'utf8')

  assert.equal(locale.includes("DEFAULT_LOCALE: Locale = 'es'"), true)

  const palette = await readFile(join(target, 'apps/web/src/lib/palettes.ts'), 'utf8')

  assert.equal(palette.includes("DEFAULT_PALETTE: PaletteId = 'forest'"), true)

  const env = await readFile(join(target, '.env'), 'utf8')

  assert.match(env, /^DEMO_MODE=false$/m)
})

test('an unknown palette is refused before the project is written', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')

  await assert.rejects(
    run([target, '--template', template, '--palette', 'neon', '--yes', '--no-git'], {
      manifest,
      version: '0.1.0',
      log: () => {},
    }),
    /palette "neon" does not exist: use one of line, ink, ocean, forest, plum, ember/
  )

  await assert.rejects(readFile(join(target, 'README.md'), 'utf8'))
})

test('no placeholder of the template survives in the project', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')

  await run(
    [
      target,
      '--template',
      template,
      '--name',
      'Acme AI',
      '--slug',
      'acme-ai',
      '--email',
      'hi@acme.test',
      '--yes',
      '--no-install',
      '--no-boot',
      '--no-git',
    ],
    {
      manifest,
      version: '0.1.0',
      log: () => {},
      run: async () => ({ code: 0, output: '', error: null }),
    }
  )

  const files = await listFiles(target)
  /**
   * The metadata directory maps to itself: its name is kept on purpose.
   */
  const tokens = Object.keys(manifest.tokens).filter(
    (token) => manifest.tokens[token] !== 'metadata'
  )

  /**
   * The core tools keep their text on purpose, and the metadata records the
   * tokens so a core update can replay them.
   */
  const literal = [...manifest.preserve, '.dash/**']

  for (const file of files.filter((path) => !isExcluded(path, literal))) {
    const content = (await readFile(join(target, file), 'utf8')).replaceAll('.dash', '')

    for (const token of tokens) {
      assert.equal(
        content.toLowerCase().includes(token.toLowerCase()),
        false,
        `the file "${file}" still holds the placeholder "${token}"`
      )
    }
  }
})

test('the harness of the development travels with the project', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')

  await run(
    [
      target,
      '--template',
      template,
      '--name',
      'Acme AI',
      '--slug',
      'acme-ai',
      '--yes',
      '--no-install',
      '--no-boot',
      '--no-git',
    ],
    {
      manifest,
      version: '0.1.0',
      log: () => {},
      run: async () => ({ code: 0, output: '', error: null }),
    }
  )

  for (const file of [
    'plugins/dsh/package.json',
    'plugins/dsh/agents/backend-dev.md',
    'plugins/dsh/skills/feature/SKILL.md',
    'plugins/dsh/scripts/checks.mjs',
    'plugins/dsh/scripts/gen.mjs',
    'plugins/dsh/scripts/check.mjs',
    'plugins/dsh/scripts/i18n.mjs',
    'plugins/dsh/scripts/context.mjs',
    'plugins/dsh/scripts/gen.test.mjs',
    'plugins/dsh/scripts/layers.json',
    'plugins/dsh/scripts/fixtures/check/eslint.txt',
    'apps/api/stubs/make/controller/main.stub',
    'plugins/dsh/hooks/hooks.json',
    '.claude-plugin/marketplace.json',
    '.claude/settings.json',
    'CLAUDE.md',
    'docs/architecture.md',
    'docs/harness.md',
    '.githooks/pre-commit',
    '.opencode/agents/dsh/backend-dev.md',
    '.opencode/commands/dsh/feature.md',
    '.opencode/plugins/dsh.js',
    'opencode.json',
  ]) {
    await readFile(join(target, file), 'utf8')
  }

  /**
   * The OpenCode files of the harness are rebranded like the rest.
   */
  assert.equal(
    await readFile(join(target, '.opencode/agents/dsh/backend-dev.md'), 'utf8'),
    '# backend-dev of Acme AI\n'
  )

  /**
   * The stubs of the generators carry no brand, so they travel byte for byte,
   * Tempura tags included. The scripts name the workspaces by their package,
   * so they follow the scope of the project, and so do the captured outputs
   * their tests parse.
   */
  const stub = await readFile(join(target, 'apps/api/stubs/make/controller/main.stub'), 'utf8')

  assert.equal(
    stub,
    await readFile(join(template, 'apps/api/stubs/make/controller/main.stub'), 'utf8')
  )
  assert.match(stub, /export default class \{\{ controllerName \}\} \{\}/)

  const checks = await readFile(join(target, 'plugins/dsh/scripts/checks.mjs'), 'utf8')
  const eslint = await readFile(
    join(target, 'plugins/dsh/scripts/fixtures/check/eslint.txt'),
    'utf8'
  )

  assert.match(checks, /name: '@acme-ai\/api'/)
  assert.equal(checks.includes('@dash/'), false)
  assert.match(eslint, /@acme-ai\/web@0\.0\.0/)
  assert.equal(eslint.includes('@dash/'), false)

  const layers = JSON.parse(await readFile(join(target, 'plugins/dsh/scripts/layers.json'), 'utf8'))

  assert.equal(layers.rows[0].generator, '`npm run gen -- controller <name>`')

  /**
   * The root scripts that drive the harness survive the rebrand of the root
   * package.
   */
  const rootPackage = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))

  assert.equal(rootPackage.name, 'acme-ai')
  assert.deepEqual(rootPackage.scripts, {
    gen: 'node plugins/dsh/scripts/gen.mjs',
    check: 'node plugins/dsh/scripts/check.mjs',
    i18n: 'node plugins/dsh/scripts/i18n.mjs',
    context: 'node plugins/dsh/scripts/context.mjs',
  })

  /**
   * The state of the machine of the developer never travels.
   */
  await assert.rejects(() => readFile(join(target, '.claude/settings.local.json'), 'utf8'))
  await assert.rejects(() => readFile(join(target, '.claude/dsh-allow'), 'utf8'))
  await assert.rejects(() =>
    readFile(join(target, '.claude/worktrees/dsh-feature/state.txt'), 'utf8')
  )
  for (const file of [
    '.opencode/commands/opsx-apply.md',
    '.opencode/skills/openspec-explore/SKILL.md',
    '.opencode/opencode-loop/ses_1.json',
    '.opencode/package.json',
  ]) {
    await assert.rejects(() => readFile(join(target, file), 'utf8'), file)
  }

  /**
   * The plugin keeps its name and the marketplace takes the one of the
   * project, so the two names change together.
   */
  const marketplace = await readFile(join(target, '.claude-plugin/marketplace.json'), 'utf8')
  const settings = await readFile(join(target, '.claude/settings.json'), 'utf8')

  assert.match(marketplace, /"name": "acme-ai"/)
  assert.match(marketplace, /"name": "dsh"/)
  assert.match(settings, /"dsh@acme-ai"/)
})

test('the repository of the project uses the gate of the commit', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')
  const commands = []

  await run([target, '--template', template, '--yes', '--no-install', '--no-boot'], {
    manifest,
    version: '0.1.0',
    log: () => {},
    run: async (command, args) => {
      commands.push(`${command} ${args.join(' ')}`)

      return { code: 0, output: '', error: null }
    },
  })

  assert.equal(commands.includes('git config core.hooksPath .githooks'), true)
  await readFile(join(target, '.githooks/pre-commit'), 'utf8')
})

test('the installer, its script and the history of the change do not travel', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')

  await run([target, '--template', template, '--yes', '--no-install', '--no-boot', '--no-git'], {
    manifest,
    version: '0.1.0',
    log: () => {},
    run: async () => ({ code: 0, output: '', error: null }),
  })

  await assert.rejects(() => readFile(join(target, 'packages/create-app/package.json'), 'utf8'))
  await assert.rejects(() => readFile(join(target, 'install.sh'), 'utf8'))
  await assert.rejects(() => readFile(join(target, 'openspec/changes/bootstrap/tasks.md'), 'utf8'))
})

test('the environment files carry the secrets of the project', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')

  await run([target, '--template', template, '--yes', '--no-install', '--no-boot', '--no-git'], {
    manifest,
    version: '0.1.0',
    log: () => {},
    run: async () => ({ code: 0, output: '', error: null }),
  })

  const rootEnv = await readFile(join(target, '.env'), 'utf8')
  const apiEnv = await readFile(join(target, 'apps/api/.env'), 'utf8')
  const gitignore = await readFile(join(target, '.gitignore'), 'utf8')

  assert.match(rootEnv, /APP_KEY=.+/)
  assert.match(rootEnv, /SUPPORT_EMAIL=support@dash-starter.test/)
  assert.match(apiEnv, /APP_KEY=.+/)
  assert.match(apiEnv, /DEFAULT_LOCALE=en/)
  assert.match(gitignore, /^\.env$/m)
})

test('the support address follows the slug of the project', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')

  await run(
    [
      target,
      '--template',
      template,
      '--slug',
      'acme-ai',
      '--yes',
      '--no-install',
      '--no-boot',
      '--no-git',
    ],
    {
      manifest,
      version: '0.1.0',
      log: () => {},
      run: async () => ({ code: 0, output: '', error: null }),
    }
  )

  const rootEnv = await readFile(join(target, '.env'), 'utf8')

  assert.match(rootEnv, /SUPPORT_EMAIL=support@acme-ai.test/)
  assert.equal(rootEnv.includes('{slug}'), false)
})

test('two projects do not share their secrets', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))

  const generate = async (name) => {
    const target = join(workspace, name)

    await run([target, '--template', template, '--yes', '--no-install', '--no-boot', '--no-git'], {
      manifest,
      version: '0.1.0',
      log: () => {},
      run: async () => ({ code: 0, output: '', error: null }),
    })

    return readFile(join(target, '.env'), 'utf8')
  }

  const first = await generate('first')
  const second = await generate('second')
  const key = (content) => content.match(/APP_KEY=(.+)/)[1]

  assert.notEqual(key(first), key(second))
})

test('a directory that is not empty is refused', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')

  await mkdir(target, { recursive: true })
  await writeFile(join(target, 'a-file.txt'), 'hello')

  await assert.rejects(
    () =>
      run([target, '--template', template, '--yes', '--no-install', '--no-boot', '--no-git'], {
        manifest,
        version: '0.1.0',
        log: () => {},
        run: async () => ({ code: 0, output: '', error: null }),
      }),
    /not empty/
  )
})

test('the lock file of the project is committed with it', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')
  const commands = []

  await run([target, '--template', template, '--yes', '--no-boot'], {
    manifest,
    version: '0.1.0',
    log: () => {},
    run: async (command, args) => {
      commands.push(`${command} ${args.join(' ')}`)

      return { code: 0, output: '', error: null }
    },
  })

  const install = commands.indexOf('npm install')
  const commit = commands.indexOf('git commit -m Initial commit')

  assert.notEqual(install, -1)
  assert.notEqual(commit, -1)
  assert.equal(install < commit, true)
})

test('a failed installation leaves the stack alone', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')
  const commands = []
  const messages = []

  await run([target, '--template', template, '--yes', '--no-git'], {
    manifest,
    version: '0.1.0',
    log: (message) => messages.push(message),
    run: async (command, args) => {
      commands.push(`${command} ${args.join(' ')}`)

      return { code: command === 'npm' ? 1 : 0, output: '', error: null }
    },
  })

  assert.equal(
    commands.some((command) => command.startsWith('docker compose')),
    false
  )
  assert.equal(
    messages.some((message) => message.includes('could not be installed')),
    true
  )
})

test('a machine without Docker keeps the project and the commands to run later', async () => {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'acme-ai')
  const commands = []
  const messages = []

  const code = await run([target, '--template', template, '--yes', '--no-git'], {
    manifest,
    version: '0.1.0',
    log: (message) => messages.push(message),
    run: async (command, args) => {
      commands.push(`${command} ${args.join(' ')}`)

      /**
       * The daemon of Docker is not running.
       */
      return { code: command === 'docker' ? 1 : 0, output: '', error: null }
    },
  })

  assert.equal(code, 0)
  assert.equal(
    commands.some((command) => command.startsWith('docker compose')),
    false
  )
  assert.equal(
    messages.some((message) => message.includes('Docker is not running')),
    true
  )
  assert.equal(
    messages.some((message) => message.includes('docker compose up -d')),
    true
  )

  /**
   * The project is whole, even without Docker: only the stack is missing.
   */
  const packageJson = await readFile(join(target, 'package.json'), 'utf8')

  assert.equal(packageJson.includes('"name": "dash-starter"'), true)
})

/**
 * Generates a project from the fixture with the given flags, without the
 * steps that need the network or Docker.
 */
async function generate(flags = []) {
  const template = await createTemplate()
  const workspace = await mkdtemp(join(tmpdir(), 'create-app-project-'))
  const target = join(workspace, 'project')

  const code = await run(
    [target, '--template', template, ...flags, '--yes', '--no-install', '--no-boot', '--no-git'],
    {
      manifest,
      version: '0.1.0',
      log: () => {},
      run: async () => ({ code: 0, output: '', error: null }),
    }
  )

  assert.equal(code, 0)

  const read = async (file) => JSON.parse(await readFile(join(target, file), 'utf8'))

  return { target, install: await read('.dash/install.json'), core: await read('.dash/core.json') }
}

const ACME = ['--name', 'Acme AI', '--slug', 'acme-ai', '--email', 'hi@acme.test']

test('the project records the ownership of its files', async () => {
  const { core } = await generate(ACME)

  assert.deepEqual(core.core, shipped.core)
  assert.deepEqual(core.userOwned, shipped.userOwned)

  for (const owned of ['apps/api/app/features/**', 'apps/web/src/features/**']) {
    assert.ok(core.userOwned.includes(owned), `"${owned}" is owned by the product`)
  }

  assert.ok(core.userOwned.includes('packages/ui/src/custom/**'))
})

test('every core file of the project carries the checksum of its bytes', async () => {
  const { target, core } = await generate(ACME)

  assert.equal(core.schemaVersion, 1)
  assert.equal(core.repository, 'github:Dash-AI-Tools/dash-starter')
  assert.equal(core.version, '0.1.0')

  const expected = (await listFiles(target))
    .filter((file) => isExcluded(file, core.core) && !isExcluded(file, core.userOwned))
    .sort()

  assert.deepEqual(Object.keys(core.checksums), expected)
  assert.ok(expected.includes('packages/ui/src/brand.ts'))
  assert.ok(expected.includes('packages/core-tools/src/metadata.js'))

  for (const file of expected) {
    assert.equal(core.checksums[file], sha256(await readFile(join(target, file))), file)
  }

  for (const file of Object.keys(core.checksums)) {
    assert.equal(file.includes('/features/') || file.includes('/custom/'), false, file)
  }
})

test('the metadata names the identity and holds no secret', async () => {
  const { target, install } = await generate(ACME)

  assert.equal(install.identity.name, 'Acme AI')
  assert.equal(install.identity.slug, 'acme-ai')
  assert.equal(install.values.scope, '@acme-ai/')
  assert.deepEqual(install.removedCapabilities, [])

  const metadata =
    (await readFile(join(target, '.dash/install.json'), 'utf8')) +
    (await readFile(join(target, '.dash/core.json'), 'utf8'))

  for (const file of ['.env', 'apps/api/.env']) {
    for (const line of (await readFile(join(target, file), 'utf8')).split('\n')) {
      const value = line.split('=').slice(1).join('=').trim()

      if (value.length >= 16) {
        assert.equal(metadata.includes(value), false, `a value of ${file} leaked`)
      }
    }
  }
})

test('the core tools keep their text while the cores are rebranded', async () => {
  const { target } = await generate(ACME)

  const tools = await readFile(join(target, 'packages/core-tools/src/metadata.js'), 'utf8')
  const toolsPackage = await readFile(join(target, 'packages/core-tools/package.json'), 'utf8')
  const ui = await readFile(join(target, 'packages/ui/package.json'), 'utf8')

  assert.match(tools, /'\.dash'/)
  assert.match(toolsPackage, /"@dash\/core-tools"/)
  assert.match(ui, /"@acme-ai\/ui"/)
})

test('the cores and the metadata travel while the installer does not', async () => {
  const { target } = await generate(ACME)
  const files = await listFiles(target)

  assert.ok(files.some((file) => file.startsWith('packages/ui/')))
  assert.ok(files.some((file) => file.startsWith('packages/core-tools/')))
  assert.ok(files.includes('.dash/core.json'))
  assert.ok(files.includes('.dash/install.json'))
  assert.equal(
    files.some(
      (file) =>
        file.startsWith('packages/create-app/') ||
        file === 'install.sh' ||
        file.startsWith('openspec/changes/')
    ),
    false
  )
})

test('the metadata records a custom template repository', async () => {
  const previous = process.env.DASH_TEMPLATE_REPO
  process.env.DASH_TEMPLATE_REPO = 'github:acme/starter-fork'

  try {
    const { core } = await generate(ACME)

    assert.equal(core.repository, 'github:acme/starter-fork')
  } finally {
    if (previous === undefined) delete process.env.DASH_TEMPLATE_REPO
    else process.env.DASH_TEMPLATE_REPO = previous
  }
})

test('the metadata records the locale and the palette of the project', async () => {
  const { install, target } = await generate([...ACME, '--locale', 'es', '--palette', 'forest'])

  assert.equal(install.locale, 'es')
  assert.equal(install.palette, 'forest')

  const locale = await readFile(join(target, 'apps/web/src/lib/i18n.tsx'), 'utf8')

  assert.match(locale, /DEFAULT_LOCALE: Locale = 'es'/)
})

test('two projects differ in their checksums only where the identity is written', async () => {
  const acme = await generate(ACME)
  const beta = await generate([
    '--name',
    'Beta Labs',
    '--slug',
    'beta-labs',
    '--email',
    'hi@beta.test',
  ])

  assert.deepEqual(Object.keys(acme.core.checksums), Object.keys(beta.core.checksums))

  for (const [file, checksum] of Object.entries(acme.core.checksums)) {
    const branded = (await readFile(join(acme.target, file), 'utf8')).toLowerCase().includes('acme')

    assert.equal(checksum === beta.core.checksums[file], !branded, file)
  }
})

test('the metadata directory keeps its name in the rebranded docs', async () => {
  const { target } = await generate(ACME)
  const architecture = await readFile(join(target, 'docs/architecture.md'), 'utf8')

  assert.match(architecture, /# Architecture of Acme AI/)
  assert.match(architecture, /`\.dash\/core\.json`/)
})
