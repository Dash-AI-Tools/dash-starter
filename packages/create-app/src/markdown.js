/**
 * The tables of a Markdown document, aligned the way Prettier aligns them.
 *
 * The rebrand replaces names of another length inside the cells, which leaves
 * the padding of their column behind: the generated project would fail its
 * own format check. Aligning a table Prettier already formatted changes
 * nothing, so every table of a rebranded document goes through it.
 */

const DELIMITER_CELL = /^:?-+:?$/

/**
 * The cells of a table row: split on the pipes that are not escaped, without
 * the outer pipes and the padding.
 */
function cells(row) {
  const parts = []
  let current = ''

  for (let index = 0; index < row.length; index++) {
    const char = row[index]

    if (char === '\\' && row[index + 1] === '|') {
      current += '\\|'
      index++
      continue
    }

    if (char === '|') {
      parts.push(current)
      current = ''
      continue
    }

    current += char
  }

  parts.push(current)

  return parts.slice(1, -1).map((cell) => cell.trim())
}

function isRow(line) {
  const trimmed = line.trim()

  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1
}

function isDelimiter(line) {
  if (!isRow(line)) return false

  const row = cells(line)

  return row.length > 0 && row.every((cell) => DELIMITER_CELL.test(cell))
}

function alignment(cell) {
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')

  if (left && right) return 'center'
  if (right) return 'right'
  if (left) return 'left'

  return 'none'
}

/**
 * The width a cell takes on screen: one column per character.
 */
function width(text) {
  return [...text].length
}

function pad(text, size, align) {
  const space = size - width(text)

  if (align === 'right') return ' '.repeat(space) + text

  if (align === 'center') {
    const before = Math.floor(space / 2)

    return ' '.repeat(before) + text + ' '.repeat(space - before)
  }

  return text + ' '.repeat(space)
}

function delimiter(size, align) {
  if (align === 'center') return `:${'-'.repeat(size - 2)}:`
  if (align === 'left') return `:${'-'.repeat(size - 1)}`
  if (align === 'right') return `${'-'.repeat(size - 1)}:`

  return '-'.repeat(size)
}

function alignTable(lines) {
  const indent = lines[0].match(/^\s*/)[0]
  const rows = lines.map(cells)
  const aligns = rows[1].map(alignment)
  const columns = Math.max(...rows.map((row) => row.length))

  const sizes = Array.from({ length: columns }, (_, column) =>
    Math.max(3, ...rows.map((row, index) => (index === 1 ? 0 : width(row[column] ?? ''))))
  )

  return rows.map((row, index) => {
    const printed = sizes.map((size, column) =>
      index === 1
        ? delimiter(size, aligns[column] ?? 'none')
        : pad(row[column] ?? '', size, aligns[column] ?? 'none')
    )

    return `${indent}| ${printed.join(' | ')} |`
  })
}

/**
 * Aligns every table of a Markdown document: a header row, a delimiter row
 * and the rows that follow. Fenced code blocks are left alone.
 */
export function alignMarkdownTables(content) {
  const lines = content.split('\n')
  const output = []
  let fence = null

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const marker = line.match(/^\s*(`{3,}|~{3,})/)

    if (marker) {
      if (fence === null) fence = marker[1][0]
      else if (marker[1][0] === fence) fence = null
      output.push(line)
      continue
    }

    if (fence === null && isRow(line) && isDelimiter(lines[index + 1] ?? '')) {
      const table = [line, lines[index + 1]]
      let next = index + 2

      while (next < lines.length && isRow(lines[next])) {
        table.push(lines[next])
        next++
      }

      output.push(...alignTable(table))
      index = next - 1
      continue
    }

    output.push(line)
  }

  return output.join('\n')
}
