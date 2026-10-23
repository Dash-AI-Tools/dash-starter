import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * The ownership of the files comes from the manifest of the template itself,
 * so the fixture can never drift from the globs that ship.
 */
export const shipped = JSON.parse(
  readFileSync(new URL('../template.json', import.meta.url), 'utf8')
)

/**
 * The manifest of the test: the same contract as the one of the template, with
 * the tokens that the fixture uses.
 */
export const manifest = {
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
    '.dash': 'metadata',
    'Dash': 'name',
    'dash': 'slug',
  },
  files: ['**/*'],
  exclude: [
    'node_modules/**',
    '**/node_modules/**',
    '**/dist/**',
    'package-lock.json',
    '.claude/settings.local.json',
    '.claude/worktrees/**',
    '.claude/.headroom*',
    '.claude/dsh-allow',
  ],
  removePaths: ['packages/create-app', 'openspec/changes'],
  removeSections: [{ file: 'README.md', heading: '## The installer' }],
  removeLines: [{ file: 'README.md', text: 'packages/create-app' }],
  removeWorkflowJobs: ['installer'],
  preserve: shipped.preserve,
  core: shipped.core,
  userOwned: shipped.userOwned,
}

/**
 * Writes a template that looks like the one of the repository.
 */
export async function createTemplate() {
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

  /**
   * The cores and the extension points: the UI kit, the tools that update the
   * cores, and the registries that belong to the product.
   */
  await mkdir(join(root, 'packages/ui/src/custom'), { recursive: true })
  await writeFile(join(root, 'packages/ui/package.json'), '{\n  "name": "@dash/ui"\n}\n')
  await writeFile(join(root, 'packages/ui/src/brand.ts'), "export const brand = 'Dash'\n")
  await writeFile(join(root, 'packages/ui/src/separator.tsx'), 'export const Separator = 1\n')
  await writeFile(join(root, 'packages/ui/src/custom/index.ts'), '// exports\n')

  await mkdir(join(root, 'packages/core-tools/src'), { recursive: true })
  await writeFile(
    join(root, 'packages/core-tools/package.json'),
    '{\n  "name": "@dash/core-tools"\n}\n'
  )
  await writeFile(
    join(root, 'packages/core-tools/src/metadata.js'),
    "export const METADATA_DIR = '.dash'\n"
  )

  await mkdir(join(root, 'apps/web/src/features'), { recursive: true })
  await writeFile(join(root, 'apps/web/src/features/index.ts'), '// features:routes\n')
  await mkdir(join(root, 'apps/api/app/features'), { recursive: true })
  await writeFile(join(root, 'apps/api/app/features/index.ts'), '// features:register\n')

  await mkdir(join(root, 'packages/create-app'), { recursive: true })
  await writeFile(join(root, 'packages/create-app/package.json'), '{}\n')

  await mkdir(join(root, 'openspec/changes/bootstrap'), { recursive: true })
  await writeFile(join(root, 'openspec/changes/bootstrap/tasks.md'), '- [ ] a task\n')

  /**
   * The harness of the development, with the state that never travels.
   */
  await mkdir(join(root, '.claude-plugin'), { recursive: true })
  await writeFile(
    join(root, '.claude-plugin/marketplace.json'),
    JSON.stringify(
      {
        name: 'dash-starter',
        owner: { name: 'Dash' },
        plugins: [{ name: 'dsh', source: './plugins/dsh' }],
      },
      null,
      2
    )
  )

  await mkdir(join(root, '.claude/worktrees/dsh-feature'), { recursive: true })
  await writeFile(
    join(root, '.claude/settings.json'),
    '{"enabledPlugins": {"dsh@dash-starter": true}}\n'
  )
  await writeFile(join(root, '.claude/settings.local.json'), '{"permissions": {}}\n')
  await writeFile(join(root, '.claude/dsh-allow'), 'env\n')
  await writeFile(join(root, '.claude/worktrees/dsh-feature/state.txt'), 'work\n')

  await mkdir(join(root, 'plugins/dsh/agents'), { recursive: true })
  await mkdir(join(root, 'plugins/dsh/skills/feature'), { recursive: true })
  await mkdir(join(root, 'plugins/dsh/scripts'), { recursive: true })
  await mkdir(join(root, 'plugins/dsh/hooks'), { recursive: true })
  await writeFile(join(root, 'plugins/dsh/package.json'), '{"name": "@dash/dsh"}\n')
  await writeFile(join(root, 'plugins/dsh/agents/backend-dev.md'), '# backend-dev of Dash\n')
  await writeFile(join(root, 'plugins/dsh/skills/feature/SKILL.md'), '# feature\n')
  await writeFile(join(root, 'plugins/dsh/scripts/checks.mjs'), 'export const root = 1\n')
  await writeFile(join(root, 'plugins/dsh/hooks/hooks.json'), '{"hooks": {}}\n')

  await mkdir(join(root, 'docs'), { recursive: true })
  await writeFile(join(root, 'CLAUDE.md'), '# Dash Starter\n')
  await writeFile(
    join(root, 'docs/architecture.md'),
    '# Architecture of Dash\n\nThe checksums live in `.dash/core.json`.\n'
  )
  await writeFile(join(root, 'docs/harness.md'), '# The harness of Dash\n')

  await mkdir(join(root, '.githooks'), { recursive: true })
  await writeFile(join(root, '.githooks/pre-commit'), '#!/bin/sh\nexit 0\n')

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
