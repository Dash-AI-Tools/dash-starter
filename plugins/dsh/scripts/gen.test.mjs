import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { test } from 'node:test'

import { loadLayers } from './context.mjs'
import { gen, plan, snapshot } from './gen.mjs'

// A project with the folders the generators run in. It is not a git
// repository: the snapshot walks the tree.
function project() {
  const root = mkdtempSync(join(tmpdir(), 'dsh-gen-'))
  for (const dir of ['apps/api/app', 'apps/web/src', 'packages/ui/src', 'openspec/changes']) {
    mkdirSync(join(root, dir), { recursive: true })
  }
  writeFileSync(join(root, 'package.json'), '{}\n')
  return root
}

function write(root, path, content = 'x\n') {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content)
}

// A runner that records each call and writes what the real generator would.
function fakeRunner(root, effect = () => {}, result = { code: 0, output: 'DONE: created\n' }) {
  const calls = []
  const runner = async (command, args, cwd) => {
    calls.push({ command, args, cwd: relative(root, cwd) || '.' })
    effect(command, args)
    return result
  }
  return { calls, runner }
}

const ACE = {
  controller: 'apps/api/app/controllers/probes_controller.ts',
  model: 'apps/api/app/models/probe.ts',
  migration: 'apps/api/database/migrations/1700000000000_create_probes_table.ts',
  validator: 'apps/api/app/validators/probe.ts',
  service: 'apps/api/app/services/probe_service.ts',
  transformer: 'apps/api/app/transformers/probe_transformer.ts',
  middleware: 'apps/api/app/middleware/probe_middleware.ts',
  exception: 'apps/api/app/exceptions/probe_exception.ts',
  event: 'apps/api/app/events/probe.ts',
  listener: 'apps/api/app/listeners/probe.ts',
  seeder: 'apps/api/database/seeders/probe_seeder.ts',
  factory: 'apps/api/database/factories/probe_factory.ts',
  test: 'apps/api/tests/unit/probe.spec.ts',
}

// One allowed flag per layer that has one, passed through as is.
const ACE_FLAGS = {
  controller: ['--resource'],
  validator: ['--resource'],
  middleware: ['--stack=named'],
  listener: ['--event=invoice_paid'],
  test: ['--suite=unit'],
  migration: ['--alter'],
  model: ['--migration'],
}

for (const [layer, path] of Object.entries(ACE)) {
  test(`${layer} runs node ace make:${layer} in apps/api`, async () => {
    const root = project()
    const { calls, runner } = fakeRunner(root, () => write(root, path))
    const flags = ACE_FLAGS[layer] ?? []
    const result = await gen([layer, 'probes', ...flags], { root, runner })
    assert.deepEqual(calls, [
      {
        command: 'node',
        args: ['ace', `make:${layer}`, 'probes', ...flags],
        cwd: 'apps/api',
      },
    ])
    assert.equal(result.code, 0)
    const lines = result.out.split('\n')
    assert.equal(lines[0], path)
    if (layer === 'migration') assert.match(lines[1], /node ace migration:run/)
    assert.equal(lines.length, layer === 'migration' ? 2 : 1)
  })
}

test('An API controller is generated', async () => {
  const root = project()
  const path = 'apps/api/app/controllers/invoices_controller.ts'
  const { runner } = fakeRunner(
    root,
    () => write(root, path, 'export default class InvoicesController {}\n'),
    { code: 0, output: 'DONE:    create app/controllers/invoices_controller.ts\n' }
  )
  const result = await gen(['controller', 'invoices'], { root, runner })
  assert.equal(result.code, 0)
  assert.equal(result.out, path)
})

test('the other layers run their generator in their workspace', async () => {
  const cases = [
    {
      argv: ['primitive', 'accordion'],
      call: { command: 'npx', args: ['shadcn', 'add', 'accordion', '--yes'], cwd: 'apps/web' },
      writes: ['packages/ui/src/accordion.tsx'],
    },
    {
      argv: ['component', 'data-card'],
      call: { command: 'npm', args: ['run', 'make:component', '--', 'data-card'], cwd: '.' },
      writes: ['packages/ui/src/custom/data-card.tsx'],
    },
    {
      argv: ['feature', 'invoices'],
      call: { command: 'npm', args: ['run', 'make:feature', '--', 'invoices'], cwd: '.' },
      writes: ['apps/web/src/features/invoices/index.ts'],
    },
    {
      argv: ['change', 'add-probes'],
      call: { command: 'openspec', args: ['new', 'change', 'add-probes'], cwd: '.' },
      writes: ['openspec/changes/add-probes/.openspec.yaml'],
    },
  ]
  for (const { argv, call, writes } of cases) {
    const root = project()
    const { calls, runner } = fakeRunner(root, () => writes.forEach((path) => write(root, path)))
    const result = await gen(argv, { root, runner })
    assert.deepEqual(calls, [call])
    assert.equal(result.code, 0, result.out)
    assert.equal(result.out, writes.join('\n'))
  }
})

test('a registry the generator edits is listed as modified', async () => {
  const root = project()
  write(root, 'apps/web/src/features/index.ts', 'export {}\n')
  const { runner } = fakeRunner(root, () => {
    write(root, 'apps/web/src/features/invoices/routes.tsx')
    write(root, 'apps/web/src/features/index.ts', "export * from './invoices/routes'\n")
  })
  const result = await gen(['feature', 'invoices'], { root, runner })
  assert.equal(
    result.out,
    'apps/web/src/features/invoices/routes.tsx\nmodified: apps/web/src/features/index.ts'
  )
})

test('an unknown layer is refused with the generator layers', async () => {
  const root = project()
  const { calls, runner } = fakeRunner(root)
  const result = await gen(['widget', 'probes'], { root, runner })
  assert.equal(result.code, 1)
  assert.match(result.out, /Unknown layer "widget"\. Generator layers: controller, /)
  assert.equal(calls.length, 0)
})

test('A layer without a generator', async () => {
  const root = project()
  const before = snapshot(root)
  const { calls, runner } = fakeRunner(root)
  const result = await gen(['ability', 'viewInvoices'], { root, runner })
  assert.equal(result.code, 1)
  assert.match(result.out, /No generator covers "ability"/)
  assert.match(result.out, /apps\/api\/app\/abilities\/main\.ts/)
  assert.equal(calls.length, 0)
  assert.deepEqual(snapshot(root), before)
})

test('An existing file is never overwritten', async () => {
  const root = project()
  const path = 'apps/api/app/controllers/invoices_controller.ts'
  write(root, path, 'export default class Mine {}\n')
  // Ace leaves the file alone and still exits 0.
  const { calls, runner } = fakeRunner(root, () => {}, {
    code: 0,
    output: 'SKIPPED: create app/controllers/invoices_controller.ts (File already exists)\n',
  })
  const result = await gen(['controller', 'invoices'], { root, runner })
  assert.equal(result.code, 1)
  assert.match(result.out, /The target exists/)
  assert.match(result.out, /File already exists/)
  assert.equal(calls.length, 1)
  assert.equal(readFileSync(join(root, path), 'utf8'), 'export default class Mine {}\n')
})

test('an existing primitive is refused before shadcn runs', async () => {
  const root = project()
  write(root, 'packages/ui/src/button.tsx', 'mine\n')
  const { calls, runner } = fakeRunner(root)
  const result = await gen(['primitive', 'button'], { root, runner })
  assert.equal(result.code, 1)
  assert.match(result.out, /packages\/ui\/src\/button\.tsx/)
  assert.equal(calls.length, 0)
  assert.equal(readFileSync(join(root, 'packages/ui/src/button.tsx'), 'utf8'), 'mine\n')
})

test('shadcn offline says that it needs the network', async () => {
  const root = project()
  const { runner } = fakeRunner(root, () => {}, {
    code: 1,
    output:
      '- Checking registry.\nSomething went wrong. Please check the error below for more details.\nrequest to https://ui.shadcn.com/r/styles/base-nova/accordion.json failed, reason: getaddrinfo ENOTFOUND ui.shadcn.com\n',
  })
  const result = await gen(['primitive', 'accordion'], { root, runner })
  assert.equal(result.code, 1)
  assert.match(result.out, /shadcn needs the network/)
  assert.match(result.out, /ENOTFOUND ui\.shadcn\.com/)
})

test('a name is required', async () => {
  const { calls, runner } = fakeRunner(project())
  const result = await gen(['controller'], { root: project(), runner })
  assert.equal(result.code, 1)
  assert.equal(calls.length, 0)
})

test('an overwriting flag is refused before the generator runs', async () => {
  for (const flag of ['--force', '-f', '--overwrite', '-o', '--force=true']) {
    const root = project()
    const { calls, runner } = fakeRunner(root)
    const result = await gen(['controller', 'invoices', flag], { root, runner })
    assert.equal(result.code, 1, flag)
    assert.match(result.out, /never overwrite/, flag)
    assert.equal(calls.length, 0, flag)
  }
})

test('a primitive name that is not kebab-case never reaches shadcn', async () => {
  const names = [
    'https://example.com/x.json',
    'http://localhost/r.json',
    './registry.json',
    '../ui/x',
    '/tmp/x.json',
    '@acme/button',
    'Button',
    'button.json',
  ]
  for (const name of names) {
    const root = project()
    const before = snapshot(root)
    const { calls, runner } = fakeRunner(root)
    const result = await gen(['primitive', name], { root, runner })
    assert.equal(result.code, 1, name)
    assert.match(result.out, /is not a valid primitive name: use lowercase kebab-case/, name)
    assert.equal(calls.length, 0, name)
    assert.deepEqual(snapshot(root), before, name)
  }
})

test('the kebab layers refuse a name with a path in it', async () => {
  for (const layer of ['component', 'feature', 'change']) {
    for (const name of ['../escape', 'a/b', 'Upper', 'a_b']) {
      const { calls, runner } = fakeRunner(project())
      const result = await gen([layer, name], { root: project(), runner })
      assert.equal(result.code, 1, `${layer} ${name}`)
      assert.equal(calls.length, 0, `${layer} ${name}`)
    }
  }
})

test('an ace name takes folders but never leaves the workspace', async () => {
  for (const name of [
    '../escape',
    'admin/../../x',
    '/abs',
    'admin//x',
    'admin/',
    '1probe',
    'a b',
  ]) {
    const { calls, runner } = fakeRunner(project())
    const result = await gen(['controller', name], { root: project(), runner })
    assert.equal(result.code, 1, name)
    assert.match(result.out, /is not a valid controller name/, name)
    assert.equal(calls.length, 0, name)
  }
  const root = project()
  const path = 'apps/api/app/controllers/admin/invoices_controller.ts'
  const { calls, runner } = fakeRunner(root, () => write(root, path))
  const result = await gen(['controller', 'admin/invoices'], { root, runner })
  assert.equal(result.code, 0, result.out)
  assert.deepEqual(calls[0].args, ['ace', 'make:controller', 'admin/invoices'])
})

test('a flag outside the allowlist of the layer is refused and names the allowed ones', async () => {
  const cases = [
    ['controller', '--foo'],
    ['controller', '-a'],
    ['controller', '-yo'],
    ['controller', '--contents-from=/etc/passwd'],
    ['controller', '--path=/tmp'],
    ['controller', '--cwd=/tmp'],
    ['controller', '../index'],
    ['middleware', '--stack=evil'],
    ['middleware', '--stack'],
    ['listener', '--event=../x'],
    ['migration', '--folder=/tmp'],
    ['service', 'extra'],
    ['primitive', '--yes'],
    ['primitive', '--overwrite'],
    ['primitive', '--path=/tmp'],
    ['primitive', '--cwd=/'],
    ['component', '--help'],
    ['change', '--store=other'],
  ]
  for (const [layer, flag] of cases) {
    const root = project()
    const { calls, runner } = fakeRunner(root)
    const result = await gen([layer, 'probes', flag], { root, runner })
    assert.equal(result.code, 1, `${layer} ${flag}`)
    assert.ok(result.out.startsWith(`Refused: ${flag}. ${layer} accepts `), result.out)
    assert.equal(calls.length, 0, `${layer} ${flag}`)
  }
  const { runner } = fakeRunner(project())
  const controller = await gen(['controller', 'probes', '--foo'], { root: project(), runner })
  assert.match(controller.out, /accepts only --resource, --api, --singular, action names\./)
  const primitive = await gen(['primitive', 'probes', '-y'], { root: project(), runner })
  assert.match(primitive.out, /primitive accepts no flags/)
})

test('every flag of the allowlist reaches the generator', async () => {
  const sample = (spec) => {
    const [, key, values] = spec.match(/^(--[a-z-]+)(?:=<(.+)>)?$/)
    if (values === undefined) return key
    return `${key}=${values.includes('|') ? values.split('|')[0] : 'probe'}`
  }
  const layers = loadLayers()
  for (const [layer, generator] of Object.entries(layers.generators)) {
    const flags = [...(generator.flags ?? []).map(sample), ...(generator.actions ? ['index'] : [])]
    const root = project()
    const { calls, runner } = fakeRunner(root, () => write(root, 'apps/api/app/x.ts'))
    await gen([layer, 'probes', ...flags], { root, runner })
    assert.equal(calls.length, 1, layer)
    const { args } = calls[0]
    const start = args.indexOf('probes') + 1
    assert.deepEqual(args.slice(start, start + flags.length), flags, layer)
  }
  assert.ok(layers.generators.middleware.flags.some((flag) => flag.startsWith('--stack=')))
})

test('a controller takes action names after its name', async () => {
  const root = project()
  const path = 'apps/api/app/controllers/probes_controller.ts'
  const { calls, runner } = fakeRunner(root, () => write(root, path))
  const result = await gen(['controller', 'probes', 'index', 'show', '--api'], { root, runner })
  assert.equal(result.code, 0, result.out)
  assert.deepEqual(calls[0].args, ['ace', 'make:controller', 'probes', 'index', 'show', '--api'])
})

test('A generator that asked a question and created nothing says to pass the flag', async () => {
  const root = project()
  // make:middleware without --stack prompts, gets no stdin, and exits 0.
  const { runner } = fakeRunner(root, () => {}, {
    code: 0,
    output:
      '\x1b[?25l❯ Under which stack you want to register the middleware? …\n❯ server\n  router\n  named\x1b[3A\x1b[86G\x1b[?25h\n',
  })
  const result = await gen(['middleware', 'probes'], { root, runner })
  assert.notEqual(result.code, 0)
  assert.match(result.out, /node ace make:middleware probes created nothing in apps\/api/)
  assert.match(result.out, /pass the flag that answers it/)
  assert.match(result.out, /Under which stack/)
  assert.doesNotMatch(result.out, /target exists/i)
  // The cursor codes of the prompt are stripped with the colours.
  assert.doesNotMatch(result.out, /\x1b/)
})

test('the snapshot skips other agents, worktrees and secrets', () => {
  const root = project()
  for (const path of [
    '.claude/worktrees/other/apps/api/app/x.ts',
    '.serena/cache.json',
    '.opencode/agents/a.md',
    '.env',
    'apps/api/.env.local',
    'apps/api/app/kept.ts',
  ]) {
    write(root, path)
  }
  const files = [...snapshot(root).keys()]
  assert.deepEqual(files.sort(), ['apps/api/app/kept.ts', 'package.json'])
})

test('the snapshot walks only the folders the generator can write, and the root files', async () => {
  const root = project()
  write(root, 'apps/web/src/main.tsx')
  assert.deepEqual([...snapshot(root, ['apps/api']).keys()].sort(), ['package.json'])

  // Another agent writes in apps/web while a controller is generated: not reported.
  const { runner } = fakeRunner(root, () => {
    write(root, 'apps/api/app/controllers/probes_controller.ts')
    write(root, 'apps/web/src/other.tsx')
    write(root, 'package.json', '{"x":1}\n')
  })
  const result = await gen(['controller', 'probes'], { root, runner })
  assert.equal(result.out, 'apps/api/app/controllers/probes_controller.ts\nmodified: package.json')
})

test('a replacement pattern in the name is not expanded in the target', () => {
  const layers = loadLayers()
  const { targets } = plan('component', "a$&b$'c", [], layers)
  assert.deepEqual(targets, ["packages/ui/src/custom/a$&b$'c.tsx"])
  const feature = plan('feature', '$`x', [], layers)
  assert.deepEqual(feature.targets, ['apps/api/app/features/$`x', 'apps/web/src/features/$`x'])
})
