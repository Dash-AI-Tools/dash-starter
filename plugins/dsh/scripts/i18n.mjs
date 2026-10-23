import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

import { repoRoot } from './checks.mjs'

export const LOCALES = ['en', 'es']

export const CATALOG_DIRS = {
  web: (locale) => `apps/web/src/locales/${locale}`,
  api: (locale) => `apps/api/resources/lang/${locale}`,
}

const EXTENSIONS = { web: 'ts', api: 'json' }

export const CATALOGS = {
  web: (namespace, locale) => `${CATALOG_DIRS.web(locale)}/${namespace}.${EXTENSIONS.web}`,
  api: (namespace, locale) => `${CATALOG_DIRS.api(locale)}/${namespace}.${EXTENSIONS.api}`,
}

// A file name of the catalog folder, camelCase like `apiKeys`: no `/`, no `.`,
// so a namespace never walks out to package.json or .claude/settings.json.
export const NAMESPACE = /^[a-z][A-Za-z0-9_-]*$/
const KEY_PART = /^[A-Za-z0-9_-]+$/
const WEB_KEY = /^[A-Za-z_$][\w$]*$/
// Parts that would reach Object.prototype through a nested assignment.
const FORBIDDEN_PARTS = new Set(['__proto__', 'constructor', 'prototype'])

const CLOSING = /^\}\s*as const\b/

// A plain object of messages: a JSON array or string is never a group.
const isGroup = (node) =>
  node !== null && typeof node === 'object' && Object.getPrototypeOf(node) === Object.prototype

const ESCAPES = { '\\': '\\\\', "'": "\\'", '\n': '\\n', '\r': '\\r', '\t': '\\t' }

// A single-quoted literal. Every control character and the line separators
// U+2028 and U+2029 are escaped too: a lone `\r` would end the line inside it.
export const quote = (text) =>
  `'${text.replace(
    /[\\'\u0000-\u001f\u2028\u2029]/g,
    (char) => ESCAPES[char] ?? `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
  )}'`

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function refuseKey(side, key) {
  const parts = side === 'api' ? key.split('.') : [key]
  if (side === 'web' && !WEB_KEY.test(key)) {
    return `"${key}" is not a valid key: use camelCase, e.g. invoicesTitle`
  }
  if (parts.some((part) => !KEY_PART.test(part))) {
    return `"${key}" is not a valid key: use letters, digits, _ and -, with . between groups`
  }
  const forbidden = parts.find((part) => FORBIDDEN_PARTS.has(part))
  if (forbidden) return `"${key}" is not a valid key: "${forbidden}" is reserved`
  return null
}

// A path with its symlinks followed; a missing file keeps its name under the
// real path of its folder (the temporary folder of macOS is itself a symlink).
const real = (path) =>
  existsSync(path) || dirname(path) === path
    ? realpathSync(path)
    : join(real(dirname(path)), basename(path))

// The catalog path of each locale, or the reason it is refused. The checks after
// the pattern are a second fence: the path, and the file a symlink points at,
// stay inside the locale's folder, and the two locales never name the same file.
export function catalogPaths(side, namespace, root) {
  if (!NAMESPACE.test(namespace)) {
    return { error: `"${namespace}" is not a valid namespace: use the file name, e.g. apiKeys` }
  }
  const paths = LOCALES.map((locale) => CATALOGS[side](namespace, locale))
  const files = paths.map((path) => resolve(root, path))
  const inside = (file, dir) => file.startsWith(dir + sep)
  const outside = LOCALES.findIndex((locale, index) => {
    const dir = resolve(root, CATALOG_DIRS[side](locale))
    return !inside(files[index], dir) || !inside(real(files[index]), real(dir))
  })
  if (outside !== -1) return { error: `${paths[outside]} is outside the catalogs of ${side}` }
  if (new Set(files.map(real)).size !== files.length) {
    return { error: `The locales of "${namespace}" resolve to the same file` }
  }
  return { paths }
}

export function webHasKey(source, key) {
  return new RegExp(`^  (['"]?)${escapeRegExp(key)}\\1\\s*:`, 'm').test(source)
}

export function webInsert(source, key, text) {
  const lines = source.split('\n')
  const closing = lines.findIndex((line) => CLOSING.test(line))
  if (closing === -1) throw new Error('has no closing `} as const` line')
  lines.splice(closing, 0, `  ${key}: ${quote(text)},`)
  return lines.join('\n')
}

export function apiHasKey(messages, key) {
  let node = messages
  for (const part of key.split('.')) {
    if (!isGroup(node) || !Object.hasOwn(node, part)) return false
    node = node[part]
  }
  return true
}

export function apiInsert(messages, key, text) {
  if (!isGroup(messages)) throw new Error('is not an object of messages')
  const parts = key.split('.')
  let node = messages
  for (const part of parts.slice(0, -1)) {
    if (!Object.hasOwn(node, part)) node[part] = {}
    if (!isGroup(node[part])) {
      throw new Error(`holds "${part}" as a value, not a group of messages`)
    }
    node = node[part]
  }
  node[parts.at(-1)] = text
  return JSON.stringify(messages, null, 2) + '\n'
}

// The Prettier of the project, through its API: the content is formatted in
// memory, so a failure leaves both catalogs untouched. Without Prettier the
// content is kept as written.
export function prettierFormatter(root) {
  let prettier
  try {
    prettier = createRequire(join(root, 'package.json'))('prettier')
  } catch {
    return async (_file, content) => content
  }
  return async (file, content) => {
    const config = (await prettier.resolveConfig(file)) ?? {}
    return prettier.format(content, { ...config, filepath: file })
  }
}

export async function addKey(argv, { root = repoRoot(), format = prettierFormatter(root) } = {}) {
  const [side, namespace, key, ...texts] = argv
  const usage = 'Usage: npm run i18n -- <web|api> <namespace> <key> <en> <es>'
  if (!Object.hasOwn(CATALOGS, side) || !namespace || !key || texts.length !== 2) {
    return { code: 1, out: usage }
  }
  const { paths, error } = catalogPaths(side, namespace, root)
  if (error) return { code: 1, out: `${error}\nNothing was written.` }
  const refused = refuseKey(side, key)
  if (refused) return { code: 1, out: `${refused}\nNothing was written.` }

  const errors = []
  const next = []
  LOCALES.forEach((locale, index) => {
    const path = paths[index]
    const file = join(root, path)
    if (!existsSync(file)) return errors.push(`${path} does not exist: no "${namespace}" namespace`)
    const source = readFileSync(file, 'utf8')
    try {
      if (side === 'web') {
        if (webHasKey(source, key)) return errors.push(`${path} already has "${key}"`)
        next.push({ path, content: webInsert(source, key, texts[index]) })
      } else {
        const messages = JSON.parse(source)
        if (apiHasKey(messages, key)) return errors.push(`${path} already has "${key}"`)
        next.push({ path, content: apiInsert(messages, key, texts[index]) })
      }
    } catch (error) {
      errors.push(`${path} ${error.message}`)
    }
  })
  if (errors.length) return { code: 1, out: [...errors, 'Nothing was written.'].join('\n') }

  // Both files are formatted before either is written, so a pair never splits.
  const formatted = []
  for (const { path, content } of next) {
    try {
      formatted.push({ path, content: await format(join(root, path), content) })
    } catch (error) {
      return {
        code: 1,
        out: [
          `Prettier failed on ${path}:`,
          String(error.message ?? error).trim(),
          'Nothing was written.',
        ].join('\n'),
      }
    }
  }
  for (const { path, content } of formatted) writeFileSync(join(root, path), content)
  return { code: 0, out: formatted.map((entry) => entry.path).join('\n') }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await addKey(process.argv.slice(2))
  ;(result.code === 0 ? process.stdout : process.stderr).write(result.out + '\n')
  process.exit(result.code)
}
