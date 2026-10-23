import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { applyOperations, assertSafePath, exists, readOrNull } from './files.js'

/**
 * The names a feature or a component cannot take: they are the folders and
 * the entry points of the project itself.
 */
export const RESERVED_NAMES = ['core', 'features', 'shared', 'app', 'api', 'ui']

/**
 * The registries the generators edit, and their markers. A new line always
 * goes right above its marker, so the marker stays last.
 */
export const API_REGISTRY = 'apps/api/app/features/index.ts'
export const WEB_REGISTRY = 'apps/web/src/features/index.ts'
export const UI_REGISTRY = 'packages/ui/src/custom/index.ts'

/**
 * The words of a kebab-case name in every case the generated code needs.
 */
export function namesOf(name) {
  const words = name.split('-')
  const pascal = words.map((word) => word[0].toUpperCase() + word.slice(1)).join('')

  return {
    kebab: name,
    snake: words.join('_'),
    camel: pascal[0].toLowerCase() + pascal.slice(1),
    pascal,
    label: words.join(' '),
  }
}

/**
 * The problems of a name, or an empty list when it can be used. The name is
 * lowercase kebab-case: it becomes a folder, a URL segment and an
 * identifier, so it starts with a letter and has no empty word.
 */
export function validateName(name) {
  if (!name) return ['A name is required, e.g. "invoices"']

  if (!/^[a-z][a-z0-9-]*$/.test(name) || name.endsWith('-') || name.includes('--')) {
    return [`"${name}" is not a valid name: use lowercase kebab-case, e.g. "purchase-orders"`]
  }

  if (RESERVED_NAMES.includes(name)) {
    return [`"${name}" is reserved: choose another name`]
  }

  return []
}

/**
 * Inserts a line right above a marker, with the indentation of the marker.
 * The marker must be a whole line and appear exactly once.
 */
export function insertAboveMarker(content, marker, line) {
  const lines = content.split('\n')
  const positions = lines.flatMap((candidate, index) =>
    candidate.trim() === marker ? [index] : []
  )

  if (positions.length !== 1) return null

  const [position] = positions
  const indentation = lines[position].match(/^\s*/)[0]

  lines.splice(position, 0, `${indentation}${line}`)

  return lines.join('\n')
}

/**
 * Formats the generated sources with the Prettier of the project, so they
 * pass its format check. A project without Prettier gets them as written.
 */
export async function projectFormatter(root) {
  let prettier

  try {
    const require = createRequire(join(root, 'package.json'))
    const module = await import(pathToFileURL(require.resolve('prettier')).href)

    /**
     * The CommonJS entry of Prettier arrives as a default export.
     */
    prettier = typeof module.format === 'function' ? module : module.default
  } catch {
    return async (_path, content) => content
  }

  return async (path, content) => {
    try {
      const config = (await prettier.resolveConfig(path)) ?? {}

      return await prettier.format(content, { ...config, filepath: path })
    } catch {
      return content
    }
  }
}

/**
 * Checks every target of a generator and applies it, or writes nothing.
 *
 * `files` are created and must not exist; `registrations` insert one line
 * above a marker of an existing registry, unless the registry already holds
 * the `guard` text. Every problem is collected first, so one run reports
 * them all.
 */
async function generate(root, { files, registrations }, { format, log }) {
  const errors = []
  const edited = new Map()

  for (const [path] of files) {
    try {
      await assertSafePath(root, path)
      if (await exists(join(root, path))) errors.push(`${path} already exists`)
    } catch (error) {
      errors.push(error.message)
    }
  }

  for (const { file, marker, line, guard } of registrations) {
    const content = edited.get(file) ?? (await readOrNull(join(root, file), 'utf8'))

    if (content === null) {
      errors.push(`${file} was not found`)
      continue
    }

    if (content.includes(guard)) {
      errors.push(`${file} already registers ${guard}`)
      continue
    }

    const next = insertAboveMarker(content, marker, line)

    if (next === null) {
      errors.push(`${file} must contain the marker "${marker}" exactly once, on a line of its own`)
      continue
    }

    edited.set(file, next)
  }

  if (errors.length > 0) {
    for (const error of errors) log(error)
    log('Nothing was written.')
    return null
  }

  const formatter = format ?? (await projectFormatter(root))
  const operations = []

  for (const [path, content] of [...files, ...edited]) {
    operations.push({ path, content: await formatter(join(root, path), content) })
  }

  await applyOperations(root, operations)

  return { created: files.map(([path]) => path), edited: [...edited.keys()] }
}

/**
 * The sources of a feature. They are real, working code: the endpoint
 * answers under the organization, the page renders in both locales and the
 * two tests pass as generated.
 */
export function featureFiles(name) {
  const { kebab, snake, camel, pascal, label } = namesOf(name)
  const api = `apps/api/app/features/${kebab}`
  const web = `apps/web/src/features/${kebab}`

  return [
    [
      `${api}/${snake}_controller.ts`,
      `import type { HttpContext } from '@adonisjs/core/http'
import { ${camel}Of } from '#features/${kebab}/${snake}_service'

/**
 * The endpoints of the ${label} feature.
 */
export default class ${pascal}Controller {
  /**
   * The ${label} of the organization. Every member reads them, so no ability
   * is required beyond the membership the organization middleware checked.
   */
  async index({ organization, serialize }: HttpContext) {
    return serialize.withoutWrapping({
      ${camel}: await ${camel}Of(organization),
    })
  }
}
`,
    ],
    [
      `${api}/${snake}_service.ts`,
      `import type Organization from '#models/organization'

/**
 * The ${label} of an organization, as the API answers them.
 */
export type ${pascal}State = {
  /** The slug of the organization. */
  organization: string
  /** The items of the feature. */
  items: { id: number; name: string }[]
}

/**
 * The ${label} of an organization. The scaffold answers an empty list:
 * replace it with the queries of the feature.
 */
export async function ${camel}Of(organization: Organization): Promise<${pascal}State> {
  return { organization: organization.slug, items: [] }
}
`,
    ],
    [
      `${api}/routes.ts`,
      `import { middleware } from '#start/kernel'
import type Router from '@adonisjs/core/services/router'

const ${pascal}Controller = () => import('#features/${kebab}/${snake}_controller')

/**
 * The routes of the ${label} feature, inside the \`/api/v1\` group. They are
 * registered by \`app/features/index.ts\`.
 */
export function register${pascal}Routes(router: typeof Router) {
  router
    .group(() => {
      router.get('orgs/:orgSlug/${kebab}', [${pascal}Controller, 'index'])
    })
    .use([middleware.auth(), middleware.org()])
}
`,
    ],
    [
      `apps/api/tests/functional/features/${snake}.spec.ts`,
      `import { test } from '@japa/runner'
import Membership from '#models/membership'
import Organization from '#models/organization'
import User from '#models/user'
import { Browser } from '#tests/helpers/browser'
import { DateTime } from 'luxon'

test.group('The ${label} feature', () => {
  test('answers the ${label} of the organization to a member', async ({ client, assert }) => {
    const user = await User.create({
      fullName: 'Test User',
      email: 'member@example.com',
      password: 'supersecret',
      locale: 'en',
      termsVersion: '2026-01-01',
      emailVerifiedAt: DateTime.now(),
    })
    const organization = await Organization.create({
      name: 'Acme Labs',
      slug: 'acme-labs',
      defaultLocale: 'en',
    })
    await Membership.create({ organizationId: organization.id, userId: user.id, role: 'member' })

    const browser = new Browser(client)
    const login = await browser.post('/api/v1/auth/login', {
      body: { email: 'member@example.com', password: 'supersecret' },
    })
    login.assertStatus(200)

    const response = await browser.get('/api/v1/orgs/acme-labs/${kebab}')

    response.assertStatus(200)
    assert.deepEqual(response.body(), {
      ${camel}: { organization: 'acme-labs', items: [] },
    })
  })

  test('refuses a visitor without a session', async ({ client }) => {
    const response = await client.get('/api/v1/orgs/acme-labs/${kebab}')

    response.assertStatus(401)
  })
})
`,
    ],
    [
      `${web}/${kebab}-page.tsx`,
      `import { PageHeader } from '@/components/patterns/page-header'
import { useI18n } from '@/lib/i18n'

/**
 * The page of the ${label} feature, at \`/app/:orgSlug/${kebab}\`. It starts
 * with the generic strings of the scaffold: add the strings of the feature to
 * both catalogs as it grows.
 */
export default function ${pascal}Page() {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <PageHeader title={t('featureScaffoldTitle')} description={t('featureScaffoldDescription')} />
    </div>
  )
}
`,
    ],
    [
      `${web}/${kebab}-page.test.tsx`,
      `import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '@/lib/i18n'
import { en } from '@/locales/en'
import { es } from '@/locales/es'
import ${pascal}Page from './${kebab}-page'

/**
 * Renders the page in a locale, chosen the way a visitor chooses it: with the
 * locale cookie.
 */
function renderIn(locale: 'en' | 'es') {
  document.cookie = \`locale=\${locale}; path=/\`

  return render(
    <I18nProvider>
      <${pascal}Page />
    </I18nProvider>
  )
}

describe('${pascal}Page', () => {
  afterEach(() => {
    document.cookie = 'locale=; path=/; max-age=0'
  })

  it('renders in English', () => {
    renderIn('en')

    expect(screen.getByRole('heading', { name: en.featureScaffoldTitle })).toBeInTheDocument()
    expect(screen.getByText(en.featureScaffoldDescription)).toBeInTheDocument()
  })

  it('renders in Spanish', () => {
    renderIn('es')

    expect(screen.getByRole('heading', { name: es.featureScaffoldTitle })).toBeInTheDocument()
    expect(screen.getByText(es.featureScaffoldDescription)).toBeInTheDocument()
  })
})
`,
    ],
    [
      `${web}/routes.tsx`,
      `import { Puzzle } from 'lucide-react'
import type { RouteObject } from 'react-router'
import type { NavItem } from '@/lib/nav'

/**
 * The pages of the ${label} feature, under \`/app/:orgSlug\`.
 */
export const ${camel}Routes: RouteObject[] = [
  {
    path: '${kebab}',
    lazy: async () => ({ Component: (await import('./${kebab}-page')).default }),
  },
]

/**
 * The entry of the feature in the main navigation.
 */
export const ${camel}Nav: NavItem[] = [
  {
    id: '${kebab}',
    labelKey: 'featureScaffoldTitle',
    path: '${kebab}',
    icon: Puzzle,
    minRole: 'member',
    station: 'line',
  },
]
`,
    ],
  ]
}

/**
 * The registrations of a feature in both registries.
 */
export function featureRegistrations(name) {
  const { kebab, camel, pascal } = namesOf(name)

  return [
    {
      file: API_REGISTRY,
      marker: '// features:imports',
      line: `import { register${pascal}Routes } from '#features/${kebab}/routes'`,
      guard: `register${pascal}Routes`,
    },
    {
      file: API_REGISTRY,
      marker: '// features:register',
      line: `register${pascal}Routes(router)`,
      guard: `register${pascal}Routes(router)`,
    },
    {
      file: WEB_REGISTRY,
      marker: '// features:imports',
      line: `import { ${camel}Nav, ${camel}Routes } from './${kebab}/routes'`,
      guard: `'./${kebab}/routes'`,
    },
    {
      file: WEB_REGISTRY,
      marker: '// features:routes',
      line: `...${camel}Routes,`,
      guard: `...${camel}Routes,`,
    },
    {
      file: WEB_REGISTRY,
      marker: '// features:nav',
      line: `...${camel}Nav,`,
      guard: `...${camel}Nav,`,
    },
  ]
}

/**
 * The sources of a custom component of the UI workspace.
 */
export function componentFiles(name) {
  const { kebab, pascal, label } = namesOf(name)
  const base = `packages/ui/src/custom/${kebab}`
  const sentence = label[0].toUpperCase() + label.slice(1)

  return [
    [
      `${base}.tsx`,
      `import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../utils'

/**
 * The props of the ${label}.
 */
export type ${pascal}Props = Omit<ComponentProps<'div'>, 'title'> & {
  /** The heading of the ${label}. */
  title: ReactNode
}

/**
 * The ${label}: a custom component of the product. It is built from the tokens
 * of the kit, so it follows the palette and the theme.
 */
export function ${pascal}({ title, className, children, ...props }: ${pascal}Props) {
  return (
    <div
      data-slot="${kebab}"
      className={cn(
        'flex flex-col gap-2 rounded-xl bg-card p-4 text-sm text-card-foreground ring-1 ring-foreground/10',
        className
      )}
      {...props}
    >
      <div className="font-medium">{title}</div>
      {children}
    </div>
  )
}
`,
    ],
    [
      `${base}.test.tsx`,
      `import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ${pascal} } from './${kebab}'

describe('${pascal}', () => {
  it('renders its title and its content', () => {
    render(<${pascal} title="${sentence}">The content</${pascal}>)

    expect(screen.getByText('${sentence}')).toBeInTheDocument()
    expect(screen.getByText('The content')).toBeInTheDocument()
  })

  it('merges the given class names', () => {
    const { container } = render(<${pascal} title="${sentence}" className="custom" />)

    expect(container.firstElementChild).toHaveClass('custom')
  })
})
`,
    ],
    [
      `${base}.stories.tsx`,
      `import type { Meta, StoryObj } from '@storybook/react-vite'
import { ${pascal} } from './${kebab}'

const meta = {
  title: 'Custom/${pascal}',
  component: ${pascal},
  args: {
    title: '${sentence}',
    children: 'The content of the ${label}.',
  },
} satisfies Meta<typeof ${pascal}>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutContent: Story = {
  args: { children: undefined },
}
`,
    ],
  ]
}

/**
 * The export of a component in the user-owned barrel.
 */
export function componentRegistrations(name) {
  const { kebab, pascal } = namesOf(name)

  return [
    {
      file: UI_REGISTRY,
      marker: '// exports',
      line: `export { ${pascal}, type ${pascal}Props } from './${kebab}'`,
      guard: `'./${kebab}'`,
    },
  ]
}

/**
 * Refuses a name and explains why.
 */
function refuse(errors, log) {
  for (const error of errors) log(error)
  log('Nothing was written.')

  return 1
}

/**
 * `make:feature <name>`: an API controller, service, routes and functional
 * test, a web page, page test and routes, and their registrations, without
 * touching a core file.
 */
export async function makeFeature(root, name, { log = console.log, format } = {}) {
  const errors = validateName(name)

  if (errors.length > 0) return refuse(errors, log)

  const { kebab } = namesOf(name)

  for (const folder of [`apps/api/app/features/${kebab}`, `apps/web/src/features/${kebab}`]) {
    if (await exists(join(root, folder))) errors.push(`${folder} already exists`)
  }

  if (errors.length > 0) return refuse(errors, log)

  const result = await generate(
    root,
    { files: featureFiles(name), registrations: featureRegistrations(name) },
    { format, log }
  )

  if (!result) return 1

  log(`Created the feature "${kebab}":`)
  for (const path of result.created) log(`  ${path}`)
  log('Registered it in:')
  for (const path of result.edited) log(`  ${path}`)
  log('')
  log(`  Endpoint  GET /api/v1/orgs/:orgSlug/${kebab}`)
  log(`  Page      /app/:orgSlug/${kebab}`)
  log('')
  log('Next: run "node ace codegen" in apps/api so the typed client knows the endpoint,')
  log('and add the strings of the feature to both locale catalogs.')

  return 0
}

/**
 * `make:component <name>`: a component, its test and its story in the
 * user-owned `packages/ui/src/custom`, exported from its barrel.
 */
export async function makeComponent(root, name, { log = console.log, format } = {}) {
  const errors = validateName(name)

  if (errors.length > 0) return refuse(errors, log)

  const result = await generate(
    root,
    { files: componentFiles(name), registrations: componentRegistrations(name) },
    { format, log }
  )

  if (!result) return 1

  log(`Created the component "${namesOf(name).pascal}":`)
  for (const path of result.created) log(`  ${path}`)
  log('Exported it from:')
  for (const path of result.edited) log(`  ${path}`)
  log('')
  log('Import it from the custom entry point of the UI package; Storybook lists its story.')

  return 0
}
