import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import { repoRoot } from './checks.mjs'
import {
  contextOf,
  findLayer,
  loadLayers,
  normalize,
  parseTable,
  plain,
  slugOf,
  splitRow,
} from './context.mjs'

const layers = loadLayers()
const guide = parseTable(readFileSync(join(repoRoot(), 'docs/architecture.md'), 'utf8'))

test('a pipe escaped or inside a code span stays in its cell', () => {
  assert.deepEqual(splitRow('| a | `x \\| y` | `p|q` |'), ['a', '`x | y`', '`p|q`'])
})

test('the guide and layers.json hold the same layers', () => {
  assert.equal(guide.length, 17)
  assert.deepEqual(
    layers.rows.map((row) => row.change),
    guide.map((row) => row.Change)
  )
  for (const row of layers.rows) assert.equal(row.layer, slugOf(row.change))
})

test('every layer names the files and the file to imitate of the guide', () => {
  for (const row of guide) {
    const layer = layers.rows.find((entry) => entry.change === row.Change)
    assert.ok(layer, `${row.Change} is missing from layers.json`)
    assert.equal(normalize(layer.files), row.Files, `files of ${row.Change}`)
    assert.equal(normalize(layer.imitate), row.Imitate, `imitate of ${row.Change}`)
  }
})

test('every layer names the generator of the guide', () => {
  for (const row of guide) {
    const layer = layers.rows.find((entry) => entry.change === row.Change)
    assert.equal(normalize(layer.generator), row.Generator, `generator of ${row.Change}`)
  }
})

test('every generator layer points at a row that names it', () => {
  for (const [name, generator] of Object.entries(layers.generators)) {
    const row = layers.rows.find((entry) => entry.layer === generator.row)
    assert.ok(row, `${name} points at a missing row`)
    assert.ok(row.generator.includes(name), `${row.change} does not name ${name}`)
  }
})

test('an alias never shadows another layer', () => {
  const names = [
    ...layers.rows.flatMap((row) => [row.layer, ...row.aliases]),
    ...Object.keys(layers.generators),
  ]
  assert.equal(new Set(names).size, names.length)
})

test('the context of a layer matches the architecture guide', () => {
  const row = guide.find((entry) => entry.Change === 'API endpoint')
  const { code, out } = contextOf('api-endpoint', layers)
  assert.equal(code, 0)
  assert.ok(out.includes(plain(row.Generator)), 'the generator')
  assert.ok(out.includes(plain(row.Imitate)), 'the file to imitate')
  assert.ok(out.includes(plain(row.Files)), 'the registration files')
  assert.ok(!out.includes('`'))
})

test('an alias and a generator layer reach their row', () => {
  assert.equal(findLayer('ability', layers).row.layer, 'authorization-rule')
  assert.equal(findLayer('e2e', layers).row.layer, 'end-to-end-journey')
  assert.equal(findLayer('controller', layers).row.layer, 'api-endpoint')
  const { out } = contextOf('controller', layers)
  assert.match(out, /generator: npm run gen -- controller <name>/)
  assert.match(contextOf('ability', layers).out, /none, write it by imitation/)
})

test('an unknown layer lists the known ones', () => {
  const { code, out } = contextOf('nope', layers)
  assert.equal(code, 1)
  assert.match(out, /Known layers: api-endpoint, /)
})
