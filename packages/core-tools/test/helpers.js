import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { listFiles } from '../src/files.js'
import {
  CORE_FILE,
  DEFAULT_CORE,
  DEFAULT_USER_OWNED,
  INSTALL_FILE,
  computeChecksums,
  serializeMetadata,
} from '../src/metadata.js'
import { materialize } from '../src/transform.js'

export const REPOSITORY = 'github:Dash-AI-Tools/dash-starter'

/**
 * The tokens of the template, the same contract as `template.json`.
 */
export const TOKENS = {
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
}

export const VALUES = {
  name: 'Acme AI',
  slug: 'acme-ai',
  description: 'A product',
  email: 'hi@acme.test',
  scope: '@acme-ai/',
  code: 'acme_ai',
  codeTest: 'acme_ai_test',
  storage: 'acme-ai-storage',
  storageTest: 'acme-ai-test-storage',
  consent: 'acme_ai_consent',
  prefix: 'acme_ai_',
}

/**
 * The install metadata of a project generated as "Acme AI", in Spanish with
 * the forest palette.
 */
export function installFixture(overrides = {}) {
  return {
    schemaVersion: 1,
    templateVersion: '0.1.0',
    identity: { name: 'Acme AI', slug: 'acme-ai', description: 'A product', email: 'hi@acme.test' },
    tokens: TOKENS,
    values: VALUES,
    exclude: [
      'node_modules/**',
      '**/node_modules/**',
      'openspec/changes/**',
      'packages/create-app/**',
    ],
    preserve: ['packages/core-tools/**'],
    removePaths: ['packages/create-app', 'openspec/changes'],
    removeSections: [{ file: 'README.md', heading: '## The installer' }],
    removeLines: [{ file: 'README.md', text: 'packages/create-app' }],
    removeWorkflowJobs: ['installer'],
    locale: 'es',
    palette: 'forest',
    removedCapabilities: [],
    ...overrides,
  }
}

const MAIN = `import { createBrowserRouter } from 'react-router'

const routes = [{ path: '/', element: 'Dash' }]

// showcase:start
if (import.meta.env.DEV) {
  routes.push({ path: '/app/:orgSlug/dev/components', lazy: () => import('./pages/ShowcasePage') })
}
// showcase:end

routes.push({ path: '*' })

export const router = createBrowserRouter(routes)
`

const LOCALE_INDEX = (locale) => `import { common } from './common'
import { showcase } from './showcase' // showcase:line

export const catalogs = {
  common,
  showcase, // showcase:line
}

export const ${locale} = {
  ...common,
  ...showcase, // showcase:line
}
`

/**
 * The files of a template release, before any transformation: they carry the
 * name of the template, the installer and the showcase.
 */
export function templateTree(overrides = {}) {
  return {
    'package.json': `${JSON.stringify(
      {
        name: 'dash-starter',
        workspaces: ['apps/*', 'packages/*'],
        scripts: { test: 'npm test --workspaces' },
        devDependencies: { prettier: '^3.0.0' },
      },
      null,
      2
    )}\n`,
    'README.md': [
      '# Dash Starter',
      '',
      '| `packages/create-app` | The installer |',
      '',
      '## The installer',
      '',
      'npx create-dash-starter',
      '',
      '## Deployment',
      '',
    ].join('\n'),
    '.github/workflows/ci.yml': [
      'jobs:',
      '  test:',
      '    steps:',
      '      - run: npm test',
      '',
      '  installer:',
      '    steps:',
      '      - run: node packages/create-app/bin/create-dash-starter.js',
      '',
    ].join('\n'),
    'docs/guide.md': '# The guide of Dash\n',
    'openspec/changes/bootstrap/tasks.md': '- [ ] a task\n',
    'packages/create-app/package.json': '{}\n',
    'apps/api/package.json': '{\n  "name": "@dash/api"\n}\n',
    'apps/api/app/brand.ts': "export const BRAND = 'Dash'\nexport const SCOPE = '@dash/api'\n",
    'apps/api/app/features/index.ts': [
      "import type Router from '@adonisjs/core/services/router'",
      '// features:imports',
      '',
      'export function registerFeatureRoutes(router: typeof Router) {',
      '  // features:register',
      '}',
      '',
    ].join('\n'),
    'apps/api/start/routes.ts': "import { registerFeatureRoutes } from '#features/index'\n",
    'apps/web/package.json': '{\n  "name": "@dash/web"\n}\n',
    'apps/web/index.html': '<title>Dash</title>\n',
    'apps/web/src/lib/i18n.tsx': "export const DEFAULT_LOCALE: Locale = 'en'\n",
    'apps/web/src/lib/palettes.ts': "export const DEFAULT_PALETTE: PaletteId = 'line'\n",
    'apps/web/src/lib/nav.ts': "export const NAV = ['dashboard']\n",
    'apps/web/src/main.tsx': MAIN,
    'apps/web/src/locales/en/index.ts': LOCALE_INDEX('en'),
    'apps/web/src/locales/es/index.ts': LOCALE_INDEX('es'),
    'apps/web/src/locales/en/common.ts': "export const common = { hello: 'Hello' }\n",
    'apps/web/src/locales/es/common.ts': "export const common = { hello: 'Hola' }\n",
    'apps/web/src/locales/en/showcase.ts':
      "export const showcase = { showcaseTitle: 'Showcase' }\n",
    'apps/web/src/locales/es/showcase.ts': "export const showcase = { showcaseTitle: 'Galería' }\n",
    'apps/web/src/pages/ShowcasePage.tsx': "import { showcase } from '../locales/en/showcase'\n",
    'apps/web/src/pages/showcase.test.tsx': "import ShowcasePage from './ShowcasePage'\n",
    'apps/web/src/pages/showcase.build.test.ts': "it('drops dev/components')\n",
    'apps/web/src/pages/Home.tsx': 'export default function Home() {}\n',
    'apps/web/src/pages/DashboardPage.tsx': 'export default function DashboardPage() {}\n',
    'apps/web/src/layouts/AppLayout.tsx': 'export default function AppLayout() {}\n',
    'apps/web/src/components/app/sidebar.tsx': 'export function Sidebar() {}\n',
    'apps/web/src/features/index.ts': [
      "import type { RouteObject } from 'react-router'",
      "import type { NavItem } from '@/lib/nav'",
      '// features:imports',
      '',
      'export const featureRoutes: RouteObject[] = [',
      '  // features:routes',
      ']',
      '',
      'export const featureNav: NavItem[] = [',
      '  // features:nav',
      ']',
      '',
    ].join('\n'),
    'packages/ui/package.json': '{\n  "name": "@dash/ui"\n}\n',
    'packages/ui/src/button.tsx': 'export function Button() {}\n',
    'packages/ui/src/custom/index.ts': '// exports\n',
    'packages/core-tools/package.json': '{\n  "name": "@dash/core-tools"\n}\n',
    'packages/core-tools/src/tool.js': "export const DIR = '.dash'\n// The tools of Dash\n",
    'packages/core-tools/bin/core.js': "import '../src/tool.js'\n",
    ...overrides,
  }
}

/**
 * Writes a tree of files. A `null` content leaves the path out.
 */
export async function writeTree(root, tree) {
  for (const [path, content] of Object.entries(tree)) {
    if (content === null) continue

    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), content)
  }

  return root
}

/**
 * A new temporary directory.
 */
export function tempDir(prefix = 'core-tools-') {
  return mkdtemp(join(tmpdir(), prefix))
}

/**
 * Generates a project the way the installer does: the template is
 * materialized with the identity, then the metadata is written with the
 * checksums of the final bytes.
 */
export async function generateProject({ tree = templateTree(), install = installFixture() } = {}) {
  const root = await tempDir('core-project-')

  await writeTree(root, tree)
  await materialize(root, install)

  const core = {
    schemaVersion: 1,
    repository: REPOSITORY,
    version: '0.1.0',
    core: DEFAULT_CORE,
    userOwned: DEFAULT_USER_OWNED,
    checksums: await computeChecksums(root, { core: DEFAULT_CORE, userOwned: DEFAULT_USER_OWNED }),
  }

  await writeTree(root, {
    [INSTALL_FILE]: serializeMetadata(install),
    [CORE_FILE]: serializeMetadata(core),
  })

  return root
}

/**
 * Every file of a tree with its bytes, to prove that nothing changed.
 */
export async function snapshot(root) {
  const files = {}

  for (const file of await listFiles(root)) {
    files[file] = (await readFile(join(root, file))).toString('base64')
  }

  return files
}

/**
 * Reads a file of a tree as text.
 */
export function read(root, path) {
  return readFile(join(root, path), 'utf8')
}

/**
 * The network seams of an update: a GitHub answer for the latest release and
 * a download that writes the given tree.
 */
export function network(tree, { tag = 'v0.2.0' } = {}) {
  const calls = { fetch: [], download: [] }

  return {
    calls,
    fetch: async (url) => {
      calls.fetch.push(url)

      return {
        ok: true,
        status: 200,
        json: async () => ({
          tag_name: tag,
          html_url: `https://github.com/Dash-AI-Tools/dash-starter/releases/tag/${tag}`,
        }),
      }
    },
    download: async (source, { dir }) => {
      calls.download.push(source)
      await writeTree(dir, tree)

      return { dir }
    },
  }
}

/**
 * A logger that keeps the lines it prints.
 */
export function logger() {
  const lines = []
  const log = (line) => lines.push(...String(line).split('\n'))

  log.lines = lines
  log.text = () => lines.join('\n')

  return log
}
