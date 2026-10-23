import assert from 'node:assert/strict'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

import { repoRoot } from './checks.mjs'
import { addKey, apiHasKey, CATALOGS, NAMESPACE, quote, webHasKey } from './i18n.mjs'

const repo = repoRoot()

// The real billing catalogs of the web app without `invoicesTitle`, and the real
// errors catalogs of the API, in a project that borrows the repository's Prettier.
function project() {
  const root = mkdtempSync(join(tmpdir(), 'dsh-i18n-'))
  symlinkSync(join(repo, 'node_modules'), join(root, 'node_modules'))
  writeFileSync(join(root, 'prettier.config.js'), readFileSync(join(repo, 'prettier.config.js')))
  for (const locale of ['en', 'es']) {
    const web = `apps/web/src/locales/${locale}/billing.ts`
    const source = readFileSync(join(repo, web), 'utf8')
      .split('\n')
      .filter((line) => !/^\s+invoicesTitle:/.test(line))
      .join('\n')
    write(root, web, source)
    const api = `apps/api/resources/lang/${locale}/errors.json`
    write(root, api, readFileSync(join(repo, api), 'utf8'))
  }
  return root
}

function write(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content)
}

const read = (root, path) => readFileSync(join(root, path), 'utf8')

const WEB = ['apps/web/src/locales/en/billing.ts', 'apps/web/src/locales/es/billing.ts']
const API = ['apps/api/resources/lang/en/errors.json', 'apps/api/resources/lang/es/errors.json']

test('A key lands in both locales', async () => {
  const root = project()
  assert.ok(!webHasKey(read(root, WEB[0]), 'invoicesTitle'))
  const result = await addKey(['web', 'billing', 'invoicesTitle', 'Invoices', 'Facturas'], {
    root,
  })
  assert.equal(result.code, 0, result.out)
  assert.equal(result.out, WEB.join('\n'))

  // Node strips the types of a `.ts` file, so importing a catalog proves it parses.
  const [en, es] = await Promise.all(
    WEB.map((path) => import(pathToFileURL(join(root, path)).href))
  )
  assert.equal(en.billing.invoicesTitle, 'Invoices')
  assert.equal(es.billing.invoicesTitle, 'Facturas')
  assert.deepEqual(Object.keys(en.billing), Object.keys(es.billing))
  assert.match(read(root, WEB[0]), /\n {2}invoicesTitle: 'Invoices',\n\} as const\n$/)
})

test('a text with quotes is escaped and formatted', async () => {
  const root = project()
  const result = await addKey(['web', 'billing', 'quoted', "It's paid", 'Está "pagada"'], { root })
  assert.equal(result.code, 0, result.out)
  const en = await import(pathToFileURL(join(root, WEB[0])).href)
  const es = await import(pathToFileURL(join(root, WEB[1])).href)
  assert.equal(en.billing.quoted, "It's paid")
  assert.equal(es.billing.quoted, 'Está "pagada"')
  assert.equal(quote('a\\b'), "'a\\\\b'")
})

test('an API key lands in both locales, nested when dotted', async () => {
  const root = project()
  let result = await addKey(['api', 'errors', 'invoice_missing', 'No invoice', 'Sin factura'], {
    root,
  })
  assert.equal(result.code, 0, result.out)
  assert.equal(result.out, API.join('\n'))
  result = await addKey(['api', 'errors', 'billing.late', 'Late', 'Tarde'], { root })
  assert.equal(result.code, 0, result.out)
  const en = JSON.parse(read(root, API[0]))
  const es = JSON.parse(read(root, API[1]))
  assert.equal(en.invoice_missing, 'No invoice')
  assert.equal(es.invoice_missing, 'Sin factura')
  assert.deepEqual(es.billing, { late: 'Tarde' })
})

test('A duplicate key is refused', async () => {
  const root = project()
  // Only the Spanish catalog has it: the English one must not change either.
  write(
    root,
    WEB[1],
    read(root, WEB[1]).replace('} as const', "  invoicesTitle: 'Facturas',\n} as const")
  )
  const before = WEB.map((path) => read(root, path))
  const result = await addKey(['web', 'billing', 'invoicesTitle', 'Invoices', 'Facturas'], {
    root,
  })
  assert.equal(result.code, 1)
  assert.match(result.out, /es\/billing\.ts already has "invoicesTitle"/)
  assert.deepEqual(
    WEB.map((path) => read(root, path)),
    before
  )

  const apiBefore = API.map((path) => read(root, path))
  const api = await addKey(['api', 'errors', 'not_found', 'x', 'y'], { root })
  assert.equal(api.code, 1)
  assert.deepEqual(
    API.map((path) => read(root, path)),
    apiBefore
  )
})

test('a missing namespace writes nothing', async () => {
  const root = project()
  write(root, 'apps/web/src/locales/en/probes.ts', 'export const probes = {\n} as const\n')
  const before = read(root, 'apps/web/src/locales/en/probes.ts')
  const result = await addKey(['web', 'probes', 'title', 'Probes', 'Sondas'], { root })
  assert.equal(result.code, 1)
  assert.match(result.out, /es\/probes\.ts does not exist/)
  assert.equal(read(root, 'apps/web/src/locales/en/probes.ts'), before)

  const api = await addKey(['api', 'nope', 'title', 'a', 'b'], { root })
  assert.equal(api.code, 1)
  assert.match(api.out, /Nothing was written/)
})

test('a call without both texts prints the usage', async () => {
  const result = await addKey(['web', 'billing', 'x', 'only english'], { root: project() })
  assert.equal(result.code, 1)
  assert.match(result.out, /Usage/)
})

// Every file of the project but the borrowed node_modules, with its content.
function tree(root, dir = '') {
  const files = {}
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name
    if (entry.name === 'node_modules') continue
    if (entry.isDirectory()) Object.assign(files, tree(root, rel))
    else files[rel] = read(root, rel)
  }
  return files
}

test('every namespace of the repository is a valid namespace', () => {
  const dirs = ['apps/web/src/locales', 'apps/api/resources/lang']
  const names = dirs.flatMap((dir) =>
    ['en', 'es'].flatMap((locale) =>
      readdirSync(join(repo, dir, locale)).map((file) => file.replace(/\.(ts|json)$/, ''))
    )
  )
  assert.ok(names.includes('apiKeys'))
  for (const name of names) assert.match(name, NAMESPACE, name)
})

test('a namespace that walks out of the catalogs writes nothing anywhere', async () => {
  const root = project()
  write(root, 'package-lock.json', '{"name":"root"}\n')
  write(root, 'package.json', '{"name":"root"}\n')
  write(root, '.claude/settings.json', '{"permissions":{"allow":["Bash(ls)"]}}\n')
  const before = tree(root)
  const cases = [
    ['api', '../../../../../package-lock'],
    ['api', '../../../../package'],
    ['api', '../../../../.claude/settings'],
    ['web', '../../../../../package-lock'],
    ['api', '/etc/passwd'],
    ['api', 'errors/../errors'],
    ['api', '.hidden'],
    ['web', 'Billing'],
    ['api', 'errors.json'],
    ['api', 'a\\b'],
  ]
  for (const [side, namespace] of cases) {
    for (const key of ['k', 'permissions.allow.0']) {
      const result = await addKey([side, namespace, key, 'v', 'v'], { root })
      assert.equal(result.code, 1, namespace)
      assert.match(result.out, /is not a valid namespace/, namespace)
      assert.match(result.out, /Nothing was written/, namespace)
    }
  }
  assert.deepEqual(tree(root), before)
})

test('a catalog path outside its folder or shared by both locales is refused', async () => {
  const root = project()
  write(root, 'apps/api/resources/lang/shared.json', '{}\n')
  const before = tree(root)
  const original = CATALOGS.api
  try {
    // A second fence behind the pattern: a path builder that escapes is still caught.
    CATALOGS.api = (namespace) => `apps/api/resources/lang/${namespace}.json`
    let result = await addKey(['api', 'shared', 'k', 'v', 'v'], { root })
    assert.equal(result.code, 1)
    assert.match(result.out, /outside the catalogs of api/)
    CATALOGS.api = (namespace) => `apps/api/resources/lang/en/../es/${namespace}.json`
    write(root, 'apps/api/resources/lang/es/same.json', '{}\n')
    result = await addKey(['api', 'same', 'k', 'v', 'v'], { root })
    assert.equal(result.code, 1)
    assert.match(result.out, /outside the catalogs of api/)
  } finally {
    CATALOGS.api = original
  }
  const same = CATALOGS.web
  try {
    CATALOGS.web = (namespace) => `apps/web/src/locales/en/${namespace}.ts`
    const result = await addKey(['web', 'billing', 'probe', 'a', 'b'], { root })
    // es resolves under en: it is outside the es folder, and it is the same file.
    assert.equal(result.code, 1)
  } finally {
    CATALOGS.web = same
  }
  assert.deepEqual(tree(root), { ...before, 'apps/api/resources/lang/es/same.json': '{}\n' })
})

test('a key that would reach Object.prototype is refused', async () => {
  const root = project()
  const before = tree(root)
  for (const key of [
    '__proto__.polluted',
    'constructor.prototype.polluted',
    'billing.__proto__',
    'prototype',
    'a..b',
    'a b',
    'a/b',
    '.a',
  ]) {
    const result = await addKey(['api', 'errors', key, 'x', 'y'], { root })
    assert.equal(result.code, 1, key)
    assert.match(result.out, /is not a valid key/, key)
  }
  for (const key of ['__proto__', 'constructor']) {
    const result = await addKey(['web', 'billing', key, 'x', 'y'], { root })
    assert.equal(result.code, 1, key)
  }
  assert.equal({}.polluted, undefined)
  assert.equal(Object.prototype.polluted, undefined)
  assert.deepEqual(tree(root), before)
  assert.equal(apiHasKey({}, 'toString'), false)
  assert.equal(apiHasKey({ a: ['x'] }, 'a.0'), false)
})

test('an array or a value is never taken as a group of messages', async () => {
  const root = project()
  for (const path of API) write(root, path, '{"list": ["a"], "title": "T"}\n')
  const before = tree(root)
  for (const key of ['list.0', 'list.length', 'title.x']) {
    const result = await addKey(['api', 'errors', key, 'x', 'y'], { root })
    assert.equal(result.code, 1, key)
    assert.match(result.out, /not a group of messages/, key)
    assert.match(result.out, /Nothing was written/, key)
  }
  assert.deepEqual(tree(root), before)
})

test('a carriage return, a line separator or a control character keeps the literal whole', async () => {
  const root = project()
  const separators = String.fromCharCode(0x2028) + String.fromCharCode(0x2029)
  const en = `one\rtwo${separators}three\ttab\u0001end`
  const es = 'uno\r\ndos'
  const result = await addKey(['web', 'billing', 'multiline', en, es], { root })
  assert.equal(result.code, 0, result.out)
  const [enCatalog, esCatalog] = await Promise.all(
    WEB.map((path) => import(pathToFileURL(join(root, path)).href))
  )
  assert.equal(enCatalog.billing.multiline, en)
  assert.equal(esCatalog.billing.multiline, es)
  assert.doesNotMatch(read(root, WEB[0]), /[\r\u0001]/)
  assert.ok(![...separators].some((char) => read(root, WEB[0]).includes(char)))
})

test('a format failure writes neither catalog', async () => {
  const root = project()
  const before = tree(root)
  let calls = 0
  // The English file formats; the Spanish one fails: neither is written.
  const format = async (file, content) => {
    calls += 1
    if (file.includes('/es/')) throw new Error('SyntaxError: boom')
    return content
  }
  const result = await addKey(['web', 'billing', 'invoicesTitle', 'Invoices', 'Facturas'], {
    root,
    format,
  })
  assert.equal(result.code, 1)
  assert.equal(calls, 2)
  assert.match(result.out, /Prettier failed on apps\/web\/src\/locales\/es\/billing\.ts/)
  assert.match(result.out, /boom/)
  assert.match(result.out, /Nothing was written/)
  assert.deepEqual(tree(root), before)
})

test('a symlinked catalog that points elsewhere or at the other locale is refused', async () => {
  const root = project()
  write(root, 'package-lock.json', '{"name":"root"}\n')
  for (const locale of ['en', 'es']) {
    symlinkSync(
      join(root, 'package-lock.json'),
      join(root, `apps/api/resources/lang/${locale}/lock.json`)
    )
  }
  const before = tree(root)
  let result = await addKey(['api', 'lock', 'k', 'v', 'v'], { root })
  assert.equal(result.code, 1)
  assert.match(result.out, /en\/lock\.json is outside the catalogs of api/)

  write(root, 'apps/api/resources/lang/en/pair.json', '{}\n')
  symlinkSync(
    join(root, 'apps/api/resources/lang/en/pair.json'),
    join(root, 'apps/api/resources/lang/es/pair.json')
  )
  result = await addKey(['api', 'pair', 'k', 'v', 'v'], { root })
  assert.equal(result.code, 1)
  assert.match(result.out, /resolve to the same file|outside the catalogs/)
  assert.deepEqual(tree(root), {
    ...before,
    'apps/api/resources/lang/en/pair.json': '{}\n',
    'apps/api/resources/lang/es/pair.json': '{}\n',
  })
})
