import assert from 'node:assert/strict'
import { join } from 'node:path'
import test from 'node:test'

import { main } from '../src/cli.js'
import { exists } from '../src/files.js'
import { fileURLToPath } from 'node:url'

import { insertAboveMarker, namesOf, projectFormatter, validateName } from '../src/generators.js'
import { logger, read, snapshot, tempDir, templateTree, writeTree } from './helpers.js'

/**
 * A checkout of the template with its registries.
 */
async function checkout(overrides = {}) {
  return writeTree(await tempDir('core-checkout-'), templateTree(overrides))
}

/**
 * Runs a generator on a checkout, without the formatter of a project.
 */
async function generate(root, argv) {
  const log = logger()
  const code = await main(argv, { cwd: root, log, error: log, format: async (_, text) => text })

  return { code, log }
}

const FEATURE_FILES = [
  'apps/api/app/features/purchase-orders/purchase_orders_controller.ts',
  'apps/api/app/features/purchase-orders/purchase_orders_service.ts',
  'apps/api/app/features/purchase-orders/routes.ts',
  'apps/api/tests/functional/features/purchase_orders.spec.ts',
  'apps/web/src/features/purchase-orders/purchase-orders-page.tsx',
  'apps/web/src/features/purchase-orders/purchase-orders-page.test.tsx',
  'apps/web/src/features/purchase-orders/routes.tsx',
]

test('a name is turned into every case the code needs', () => {
  assert.deepEqual(namesOf('purchase-orders'), {
    kebab: 'purchase-orders',
    snake: 'purchase_orders',
    camel: 'purchaseOrders',
    pascal: 'PurchaseOrders',
    label: 'purchase orders',
  })
})

test('only an unreserved kebab-case name is accepted', () => {
  assert.deepEqual(validateName('invoices'), [])
  assert.deepEqual(validateName('data-card2'), [])

  for (const name of ['Invoices', 'purchase_orders', '1st', 'a-', 'a--b', '-a', 'a b', '']) {
    assert.equal(validateName(name).length, 1, name)
  }

  for (const name of ['core', 'features', 'shared', 'app', 'api', 'ui']) {
    assert.match(validateName(name)[0], /is reserved/)
  }
})

test('a line is inserted right above its marker, with its indentation', () => {
  const content = 'const a = [\n  // features:routes\n]\n'

  assert.equal(
    insertAboveMarker(content, '// features:routes', '...b,'),
    'const a = [\n  ...b,\n  // features:routes\n]\n'
  )
  assert.equal(insertAboveMarker('// other\n', '// features:routes', 'x'), null)
  assert.equal(insertAboveMarker('x // features:routes\n', '// features:routes', 'x'), null)
  assert.equal(insertAboveMarker('// exports\n// exports\n', '// exports', 'x'), null)
})

test('make:feature creates a working feature and registers it through the markers', async () => {
  const root = await checkout()
  const { code, log } = await generate(root, ['make:feature', 'purchase-orders'])

  assert.equal(code, 0, log.text())

  for (const file of FEATURE_FILES) {
    assert.equal(await exists(join(root, file)), true, file)
  }

  assert.equal(
    await read(root, 'apps/api/app/features/index.ts'),
    [
      "import type Router from '@adonisjs/core/services/router'",
      "import { registerPurchaseOrdersRoutes } from '#features/purchase-orders/routes'",
      '// features:imports',
      '',
      'export function registerFeatureRoutes(router: typeof Router) {',
      '  registerPurchaseOrdersRoutes(router)',
      '  // features:register',
      '}',
      '',
    ].join('\n')
  )
  assert.equal(
    await read(root, 'apps/web/src/features/index.ts'),
    [
      "import type { RouteObject } from 'react-router'",
      "import type { NavItem } from '@/lib/nav'",
      "import { purchaseOrdersNav, purchaseOrdersRoutes } from './purchase-orders/routes'",
      '// features:imports',
      '',
      'export const featureRoutes: RouteObject[] = [',
      '  ...purchaseOrdersRoutes,',
      '  // features:routes',
      ']',
      '',
      'export const featureNav: NavItem[] = [',
      '  ...purchaseOrdersNav,',
      '  // features:nav',
      ']',
      '',
    ].join('\n')
  )

  const routes = await read(root, 'apps/api/app/features/purchase-orders/routes.ts')
  const controller = await read(
    root,
    'apps/api/app/features/purchase-orders/purchase_orders_controller.ts'
  )
  const page = await read(root, 'apps/web/src/features/purchase-orders/purchase-orders-page.tsx')
  const webRoutes = await read(root, 'apps/web/src/features/purchase-orders/routes.tsx')
  const spec = await read(root, 'apps/api/tests/functional/features/purchase_orders.spec.ts')

  assert.match(routes, /export function registerPurchaseOrdersRoutes\(router: typeof Router\)/)
  assert.match(
    routes,
    /router\.get\('orgs\/:orgSlug\/purchase-orders', \[PurchaseOrdersController, 'index'\]\)/
  )
  assert.match(routes, /\.use\(\[middleware\.auth\(\), middleware\.org\(\)\]\)/)
  assert.match(routes, /import\('#features\/purchase-orders\/purchase_orders_controller'\)/)
  assert.match(controller, /export default class PurchaseOrdersController/)
  assert.match(controller, /from '#features\/purchase-orders\/purchase_orders_service'/)
  assert.match(page, /export default function PurchaseOrdersPage\(\)/)
  assert.match(page, /t\('featureScaffoldTitle'\)/)
  assert.match(page, /t\('featureScaffoldDescription'\)/)
  assert.match(webRoutes, /export const purchaseOrdersRoutes: RouteObject\[\]/)
  assert.match(webRoutes, /export const purchaseOrdersNav: NavItem\[\]/)
  assert.match(webRoutes, /minRole: 'member'/)
  assert.match(spec, /browser\.get\('\/api\/v1\/orgs\/acme-labs\/purchase-orders'\)/)

  assert.equal(await read(root, 'apps/web/src/main.tsx'), templateTree()['apps/web/src/main.tsx'])
  assert.equal(
    await read(root, 'apps/web/src/lib/nav.ts'),
    templateTree()['apps/web/src/lib/nav.ts']
  )
})

test('make:feature refuses an invalid or reserved name and writes nothing', async () => {
  const root = await checkout()
  const before = await snapshot(root)

  for (const name of ['Invoices', 'api', 'a--b']) {
    const { code, log } = await generate(root, ['make:feature', name])

    assert.equal(code, 1, name)
    assert.ok(log.lines.includes('Nothing was written.'))
  }

  assert.equal((await generate(root, ['make:feature'])).code, 1)
  assert.deepEqual(await snapshot(root), before)
})

test('make:feature refuses an existing feature and writes nothing', async () => {
  const root = await checkout({ 'apps/web/src/features/invoices/notes.md': 'mine\n' })
  const before = await snapshot(root)

  const { code, log } = await generate(root, ['make:feature', 'invoices'])

  assert.equal(code, 1)
  assert.ok(log.lines.includes('apps/web/src/features/invoices already exists'))
  assert.deepEqual(await snapshot(root), before)

  const second = await checkout()

  assert.equal((await generate(second, ['make:feature', 'invoices'])).code, 0)

  const snapshotAfter = await snapshot(second)
  const again = await generate(second, ['make:feature', 'invoices'])

  assert.equal(again.code, 1)
  assert.deepEqual(await snapshot(second), snapshotAfter)
})

test('make:feature refuses a registry without its marker and writes nothing', async () => {
  const root = await checkout({
    'apps/web/src/features/index.ts': 'export const featureRoutes = []\n// features:imports\n',
  })
  const before = await snapshot(root)

  const { code, log } = await generate(root, ['make:feature', 'invoices'])

  assert.equal(code, 1)
  assert.ok(
    log.lines.includes(
      'apps/web/src/features/index.ts must contain the marker "// features:routes" exactly once, on a line of its own'
    )
  )
  assert.deepEqual(await snapshot(root), before)
})

test('make:feature refuses a missing registry and writes nothing', async () => {
  const root = await checkout({ 'apps/api/app/features/index.ts': null })
  const before = await snapshot(root)

  const { code, log } = await generate(root, ['make:feature', 'invoices'])

  assert.equal(code, 1)
  assert.ok(log.lines.includes('apps/api/app/features/index.ts was not found'))
  assert.deepEqual(await snapshot(root), before)
})

test('make:component creates a component, its test and its story, and exports it', async () => {
  const root = await checkout()
  const { code, log } = await generate(root, ['make:component', 'data-card'])

  assert.equal(code, 0, log.text())
  assert.equal(
    await read(root, 'packages/ui/src/custom/index.ts'),
    "export { DataCard, type DataCardProps } from './data-card'\n// exports\n"
  )

  const component = await read(root, 'packages/ui/src/custom/data-card.tsx')
  const story = await read(root, 'packages/ui/src/custom/data-card.stories.tsx')
  const spec = await read(root, 'packages/ui/src/custom/data-card.test.tsx')

  assert.match(component, /import \{ cn \} from '\.\.\/utils'/)
  assert.match(component, /export function DataCard\(/)
  assert.match(story, /import type \{ Meta, StoryObj \} from '@storybook\/react-vite'/)
  assert.match(story, /title: 'Custom\/DataCard'/)
  assert.match(story, /satisfies Meta<typeof DataCard>/)
  assert.match(spec, /render\(<DataCard title="Data card">The content<\/DataCard>\)/)
})

test('make:component refuses an invalid or existing component and writes nothing', async () => {
  const root = await checkout({ 'packages/ui/src/custom/data-card.tsx': 'mine\n' })
  const before = await snapshot(root)

  const existing = await generate(root, ['make:component', 'data-card'])
  const invalid = await generate(root, ['make:component', 'DataCard'])
  const reserved = await generate(root, ['make:component', 'ui'])

  assert.equal(existing.code, 1)
  assert.ok(existing.log.lines.includes('packages/ui/src/custom/data-card.tsx already exists'))
  assert.equal(invalid.code, 1)
  assert.equal(reserved.code, 1)
  assert.deepEqual(await snapshot(root), before)
})

test('make:component refuses a barrel without its marker and writes nothing', async () => {
  const root = await checkout({ 'packages/ui/src/custom/index.ts': 'export {}\n' })
  const before = await snapshot(root)

  const { code } = await generate(root, ['make:component', 'data-card'])

  assert.equal(code, 1)
  assert.deepEqual(await snapshot(root), before)
})

test('the generated sources go through the formatter of the project', async () => {
  const root = await checkout()
  const formatted = []
  const log = logger()

  const code = await main(['make:component', 'data-card'], {
    cwd: root,
    log,
    format: async (path, text) => {
      formatted.push(path.slice(root.length + 1))
      return text
    },
  })

  assert.equal(code, 0)
  assert.deepEqual(formatted.sort(), [
    'packages/ui/src/custom/data-card.stories.tsx',
    'packages/ui/src/custom/data-card.test.tsx',
    'packages/ui/src/custom/data-card.tsx',
    'packages/ui/src/custom/index.ts',
  ])
})

test('the formatter of the project is its own Prettier, and a project without one is left alone', async () => {
  const repository = fileURLToPath(new URL('../../..', import.meta.url))
  const format = await projectFormatter(repository)
  const path = join(repository, 'apps/web/src/features/example/routes.tsx')

  assert.equal(await format(path, 'export const a = {b: "c"};\n'), "export const a = { b: 'c' }\n")

  const bare = await projectFormatter(await tempDir())

  assert.equal(await bare(path, 'export const a = {b: "c"};\n'), 'export const a = {b: "c"};\n')
})
