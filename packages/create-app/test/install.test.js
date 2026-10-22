import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { run } from '../src/index.js'
import { listFiles } from '../src/files.js'

/**
 * The manifest of the test: the same contract as the one of the template, with
 * the tokens that the fixture uses.
 */
const manifest = {
  version: '0.1.0',
  identity: {
    name: { default: 'Dash' },
    slug: { default: 'dash-starter' },
    description: { default: 'The AI SaaS starter for launching your next product' },
    locale: { default: 'en' },
    palette: { default: 'line' },
    email: { default: 'support@{slug}.test' },
  },
  tokens: {
    'The AI SaaS starter for launching your next product': 'description',
    'support@dash-starter.test': 'email',
    'dash-test-storage': 'storageTest',
    'dash-storage': 'storage',
    'dash_consent': 'consent',
    'dash_test': 'codeTest',
    'dash-starter': 'slug',
    'dash starter': 'name',
    'dash_': 'prefix',
    '@dash/': 'scope',
    'Dash': 'name',
    'dash': 'slug',
  },
  files: ['**/*'],
  exclude: ['node_modules/**', '**/node_modules/**', '**/dist/**', 'package-lock.json'],
  removePaths: ['packages/create-app', 'openspec/changes'],
  removeSections: [{ file: 'README.md', heading: '## The installer' }],
  removeLines: [{ file: 'README.md', text: 'packages/create-app' }],
  removeWorkflowJobs: ['installer'],
}

/**
 * Writes a template that looks like the one of the repository.
 */
async function createTemplate() {
  const root = await mkdtemp(join(tmpdir(), 'create-app-template-'))

  await writeFile(
    join(root, 'README.md'),
    [
      '# Dash Starter',
      '',
      'A production-ready **AI SaaS starter**.',
      '',
      '| `packages/create-app` | The installer |',
      '| `apps/api` | The API |',
      '',
      '## The installer',
      '',
      '```bash',
      'npx create-dash-starter my-product',
      '```',
      '',
      '## Deployment',
      '',
      'docker compose up',
      '',
    ].join('\n')
  )

  await writeFile(join(root, 'package.json'), '{\n  "name": "dash-starter"\n}\n')
  await writeFile(join(root, '.env.example'), 'APP_KEY=\nSUPPORT_EMAIL=support@dash-starter.test\n')
  await writeFile(join(root, '.gitignore'), '.env\nnode_modules\n')

  await mkdir(join(root, 'apps/api'), { recursive: true })
  await writeFile(
    join(root, 'apps/api/.env.example'),
    'APP_KEY=\nDEFAULT_LOCALE=en\nMAIL_FROM=Dash <no-reply@dash-starter.test>\nMAIL_FROM_NAME=Dash\n'
  )
  await writeFile(join(root, 'apps/api/package.json'), '{\n  "name": "@dash/api"\n}\n')

  await mkdir(join(root, 'apps/web/src/lib'), { recursive: true })
  await writeFile(
    join(root, 'apps/web/src/lib/i18n.tsx'),
    "export const DEFAULT_LOCALE: Locale = 'en'\n"
  )
  await writeFile(
    join(root, 'apps/web/src/lib/palettes.ts'),
    "export const DEFAULT_PALETTE: PaletteId = 'line'\n"
  )

  await mkdir(join(root, 'packages/create-app'), { recursive: true })
  await writeFile(join(root, 'packages/create-app/package.json'), '{}\n')

  await mkdir(join(root, 'openspec/changes/bootstrap'), { recursive: true })
  await writeFile(join(root, 'openspec/changes/bootstrap/tasks.md'), '- [ ] a task\n')

  await mkdir(join(root, '.github/workflows'), { recursive: true })
  await writeFile(
    join(root, '.github/workflows/ci.yml'),
    [
      'name: CI',
      '',
      'jobs:',
      '  lint:',
      '    steps:',
      '      - run: npm run lint',
      '',
      '  installer:',
      '    steps:',
      '      - run: node packages/create-app/bin/create-dash-starter.js',
      '',
      '  test:',
      '    steps:',
      '      - run: npm test',
      '',
    ].join('\n')
  )

  return root
}

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
  const tokens = Object.keys(manifest.tokens)

  for (const file of files) {
    const content = await readFile(join(target, file), 'utf8')

    for (const token of tokens) {
      assert.equal(
        content.toLowerCase().includes(token.toLowerCase()),
        false,
        `the file "${file}" still holds the placeholder "${token}"`
      )
    }
  }
})

test('the installer and the history of the change do not travel', async () => {
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
