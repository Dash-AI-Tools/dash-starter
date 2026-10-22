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
 * Whether a path is excluded by a list of globs. The paths of the directories
 * end with a slash, so a pattern like `node_modules/**` prunes the directory
 * itself and everything inside it.
 */
export function isExcluded(relativePath, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(relativePath))
}
