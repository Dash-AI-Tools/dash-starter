/**
 * Turns a glob into a regular expression. The installer only needs the
 * patterns of the manifest, so the whole glob language of a library is not
 * necessary: `*`, `**` and `?` are enough.
 */
export function globToRegExp(pattern) {
  let source = '^'

  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index]

    if (char === '*') {
      if (pattern[index + 1] === '*') {
        index++

        if (pattern[index + 1] === '/') {
          index++
          source += '(?:.*/)?'
        } else {
          source += '.*'
        }
      } else {
        source += '[^/]*'
      }

      continue
    }

    if (char === '?') {
      source += '[^/]'
      continue
    }

    source += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  return new RegExp(`${source}$`)
}

/**
 * The part of a glob before its first wildcard: every path it matches starts
 * with it.
 */
function literalPrefix(pattern) {
  const index = pattern.search(/[*?]/)

  return index === -1 ? pattern : pattern.slice(0, index)
}

/**
 * Whether a path is excluded by a list of globs. The paths of the directories
 * end with a slash, so a pattern like `node_modules/**` prunes the directory
 * itself and everything inside it.
 *
 * A pattern that starts with `!` takes a path back, as in a `.gitignore`: the
 * path is kept, and so is every directory on the way to it, so the walk still
 * reaches it.
 */
export function isExcluded(relativePath, patterns) {
  const kept = patterns.filter((pattern) => pattern.startsWith('!')).map((p) => p.slice(1))
  const dropped = patterns.filter((pattern) => !pattern.startsWith('!'))

  if (!dropped.some((pattern) => globToRegExp(pattern).test(relativePath))) return false
  if (kept.some((pattern) => globToRegExp(pattern).test(relativePath))) return false
  if (relativePath.endsWith('/')) {
    return !kept.some((pattern) => literalPrefix(pattern).startsWith(relativePath))
  }

  return true
}
