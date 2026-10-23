// `context <layer>`: the generator, the file to imitate and the files that
// register a kind of change, read from `layers.json`. The same table lives in
// `docs/architecture.md`; a test keeps the two equal, so an agent can ask for
// one row instead of reading the whole guide.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

export function loadLayers(file = join(here, 'layers.json')) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

export const normalize = (text) => text.replace(/\s+/g, ' ').trim()

// The cells of a markdown table row. A pipe escaped as `\|` or inside a code
// span belongs to its cell, as GitHub renders it.
export function splitRow(line) {
  const cells = []
  let cell = ''
  let code = false
  const body = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  for (let index = 0; index < body.length; index++) {
    const char = body[index]
    if (char === '\\' && body[index + 1] === '|') {
      cell += '|'
      index++
      continue
    }
    if (char === '`') code = !code
    if (char === '|' && !code) {
      cells.push(normalize(cell))
      cell = ''
      continue
    }
    cell += char
  }
  cells.push(normalize(cell))
  return cells
}

// The rows of the table under `heading`, keyed by its column names.
export function parseTable(markdown, heading = 'Where each kind of change lives') {
  const lines = markdown.split('\n')
  const start = lines.findIndex((line) => line.replace(/^#+\s*/, '').trim() === heading)
  if (start === -1) return []
  const table = []
  for (const line of lines.slice(start + 1)) {
    if (line.trim().startsWith('|')) table.push(line)
    else if (table.length) break
  }
  const [header, , ...body] = table
  if (!header) return []
  const columns = splitRow(header)
  return body.map((line) => {
    const cells = splitRow(line)
    return Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? '']))
  })
}

export const slugOf = (change) =>
  change
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// The row of a layer, an alias or a generator layer (`controller` names the
// API endpoint row).
export function findLayer(name, layers = loadLayers()) {
  const key = String(name || '').toLowerCase()
  const row = layers.rows.find((entry) => entry.layer === key || entry.aliases.includes(key))
  if (row) return { row, generator: null }
  const generator = layers.generators[key]
  if (!generator) return null
  return { row: layers.rows.find((entry) => entry.layer === generator.row), generator: key }
}

export const plain = (text) => text.replaceAll('`', '')

export function knownLayers(layers = loadLayers()) {
  return [...layers.rows.map((row) => row.layer), ...Object.keys(layers.generators)]
}

export function contextOf(name, layers = loadLayers()) {
  const found = findLayer(name, layers)
  if (!found) {
    return {
      code: 1,
      out: `Unknown layer "${name}". Known layers: ${knownLayers(layers).join(', ')}`,
    }
  }
  const { row, generator } = found
  const lines = [`layer: ${row.layer} (${row.change})`]
  if (generator) lines.push(`generator: npm run gen -- ${generator} <name>`)
  else
    lines.push(
      `generator: ${row.generator === '—' ? 'none, write it by imitation' : plain(row.generator)}`
    )
  lines.push(`imitate: ${plain(row.imitate)}`)
  lines.push(`files: ${plain(row.files)}`)
  return { code: 0, out: lines.join('\n') }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = contextOf(process.argv[2])
  ;(result.code === 0 ? process.stdout : process.stderr).write(result.out + '\n')
  process.exit(result.code)
}
