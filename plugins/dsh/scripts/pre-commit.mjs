// The gate of the commit: the staged files are checked before the commit lands.
// Called by `.githooks/pre-commit`.
import { checkStaged, repoRoot } from './checks.mjs'

const root = repoRoot()
const result = await checkStaged({ root })

if (result.secrets.length) {
  console.error(
    `Refused: these staged files hold secrets or are generated:\n${result.secrets
      .map((path) => `  - ${path}`)
      .join('\n')}\nUnstage them, or commit with --no-verify if you know what you are doing.`
  )
  process.exit(1)
}

const failed = [...result.checks.results, ...result.style.results].filter((entry) => !entry.ok)
if (failed.length) {
  console.error(
    `Refused: the staged changes do not pass their checks.\n${failed
      .map((entry) => `  - ${entry.workspace}: ${entry.check}`)
      .join('\n')}`
  )
  for (const entry of failed) {
    console.error(`\n### ${entry.workspace}: ${entry.check}\n${entry.output.trim()}`)
  }
  process.exit(1)
}

console.log(`Checked ${result.staged.length} staged file(s): ok.`)
