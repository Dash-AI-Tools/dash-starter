import { parseArgs } from 'node:util'

import { makeComponent, makeFeature } from './generators.js'
import { findProjectRoot } from './metadata.js'
import { removeShowcase } from './showcase.js'
import { runUpdate } from './update.js'

const ENTRY = 'node packages/core-tools/bin/core.js'

/**
 * The usage of the tools, printed by `--help` and when the arguments are
 * wrong.
 */
export const USAGE = `
Usage: ${ENTRY} <command> [options]

Commands:
  update                 Update the core files from a template release
  check                  Report what an update would change, without writing
  make:feature <name>    Scaffold a feature in the API and the web app
  make:component <name>  Scaffold a component in packages/ui/src/custom
  remove:showcase        Remove the in-app component showcase

Run "${ENTRY} <command> --help" for the options of a command.
`

/**
 * The help of every command.
 */
export const COMMANDS = {
  'update': `
Usage: ${ENTRY} update [--to <version|ref>] [--source <dir>] [--dry-run]

Downloads a release of the template recorded in .dash/core.json, replays the
identity and the removals recorded in .dash/install.json on it, and replaces
the core files the project has not modified. Modified core files are kept and
reported; the command then exits with 1.

Options:
  --to <version|ref>  Release to update to, e.g. 0.2.0 (default: the latest release)
  --source <dir>      A local checkout of the template to use instead of a download
  --dry-run           Print what would change and write nothing
  --help              Print this message
`,
  'check': `
Usage: ${ENTRY} check [--to <version|ref>] [--source <dir>]

Reports what "update" would change and writes nothing. Exits with 1 when
anything is pending.

Options:
  --to <version|ref>  Release to compare with (default: the latest release)
  --source <dir>      A local checkout of the template to use instead of a download
  --help              Print this message
`,
  'make:feature': `
Usage: ${ENTRY} make:feature <name>

Creates a feature: an API controller, service, routes and functional test under
apps/api/app/features/<name>, a page, its test and its routes under
apps/web/src/features/<name>, and registers both through the feature
registries. The name is lowercase kebab-case, e.g. "purchase-orders".

Options:
  --help  Print this message
`,
  'make:component': `
Usage: ${ENTRY} make:component <name>

Creates a component, its test and its story in packages/ui/src/custom and
exports it from packages/ui/src/custom/index.ts. The name is lowercase
kebab-case, e.g. "data-card".

Options:
  --help  Print this message
`,
  'remove:showcase': `
Usage: ${ENTRY} remove:showcase

Removes the in-app component showcase: its page, tests, strings, route and
catalog registrations. Home, the dashboard, the UI kit and Storybook stay.
Running it again changes nothing.

Options:
  --help  Print this message
`,
}

/**
 * The flags each command accepts.
 */
const OPTIONS = {
  'update': {
    'to': { type: 'string' },
    'source': { type: 'string' },
    'dry-run': { type: 'boolean' },
  },
  'check': { to: { type: 'string' }, source: { type: 'string' } },
  'make:feature': {},
  'make:component': {},
  'remove:showcase': {},
}

/**
 * The number of positional arguments each command takes.
 */
const POSITIONALS = {
  'update': 0,
  'check': 0,
  'make:feature': 1,
  'make:component': 1,
  'remove:showcase': 0,
}

/**
 * Reads the arguments of the command line.
 */
export function parseCli(argv) {
  const [command, ...rest] = argv

  if (!command || command === '--help' || command === '-h') return { help: true }

  if (!Object.hasOwn(COMMANDS, command)) throw new Error(`Unknown command "${command}"`)

  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: { ...OPTIONS[command], help: { type: 'boolean', short: 'h' } },
  })

  if (!values.help && positionals.length !== POSITIONALS[command]) {
    throw new Error(
      POSITIONALS[command] === 0
        ? `"${command}" takes no argument`
        : `"${command}" takes exactly one name`
    )
  }

  return { command, ...values, name: positionals[0] }
}

/**
 * Runs a command. `options` carries the seams of the tests: the working
 * directory, the logger and the network.
 */
export async function run(argv, options = {}) {
  const log = options.log ?? console.log

  let cli

  try {
    cli = parseCli(argv)
  } catch (error) {
    log(error.message)
    log(USAGE)
    return 1
  }

  if (cli.help) {
    log(cli.command ? COMMANDS[cli.command] : USAGE)
    return 0
  }

  const root = await findProjectRoot(options.cwd)

  switch (cli.command) {
    case 'update':
    case 'check':
      return runUpdate({
        ...options,
        root,
        log,
        to: cli.to,
        source: cli.source,
        mode: cli.command === 'check' ? 'check' : cli['dry-run'] ? 'dry-run' : 'update',
      })
    case 'make:feature':
      return makeFeature(root, cli.name, { log, format: options.format })
    case 'make:component':
      return makeComponent(root, cli.name, { log, format: options.format })
    case 'remove:showcase':
      return removeShowcase(root, { log })
  }
}

/**
 * The entry point of the command. It never throws: a failure is a message
 * and an exit code.
 */
export async function main(argv, options = {}) {
  try {
    return await run(argv, options)
  } catch (error) {
    ;(options.error ?? console.error)(error.message)
    return 1
  }
}
