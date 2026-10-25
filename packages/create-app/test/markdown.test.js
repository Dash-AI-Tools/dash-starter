import assert from 'node:assert/strict'
import test from 'node:test'

import { alignMarkdownTables } from '../src/markdown.js'

test('a table whose cells changed length is aligned again', () => {
  const table = [
    '| Workspace             | Package               |',
    '| --------------------- | --------------------- |',
    '| `packages/ui`         | `@acme/ui`         |',
    '| `packages/core-tools` | `@acme/core-tools` |',
  ].join('\n')

  assert.equal(
    alignMarkdownTables(table),
    [
      '| Workspace             | Package            |',
      '| --------------------- | ------------------ |',
      '| `packages/ui`         | `@acme/ui`         |',
      '| `packages/core-tools` | `@acme/core-tools` |',
    ].join('\n')
  )
})

test('an aligned table is left as it is', () => {
  const table = [
    'Some text.',
    '',
    '| Flag                | What it does         |',
    '| ------------------- | -------------------- |',
    '| `--locale <en\\|es>` | Default locale       |',
    '| `--yes`             | Accept every default |',
    '',
  ].join('\n')

  assert.equal(alignMarkdownTables(table), table)
})

test('the alignment of each column is kept', () => {
  const table = ['| a | b | c |', '| :- | :-: | -: |', '| left | middle | right |'].join('\n')

  assert.equal(
    alignMarkdownTables(table),
    ['| a    |   b    |     c |', '| :--- | :----: | ----: |', '| left | middle | right |'].join(
      '\n'
    )
  )
})

test('a table inside a fence of code is not touched', () => {
  const content = ['```md', '| a | b |', '| - | - |', '| long cell | x |', '```'].join('\n')

  assert.equal(alignMarkdownTables(content), content)
})
