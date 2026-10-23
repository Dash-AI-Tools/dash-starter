import { parseArgs } from 'node:util'

/**
 * The flags of the installer. Every value of the identity can be given as a
 * flag, so the installer can run without a single question.
 */
const OPTIONS = {
  'name': { type: 'string' },
  'slug': { type: 'string' },
  'description': { type: 'string' },
  'locale': { type: 'string' },
  'palette': { type: 'string' },
  'email': { type: 'string' },
  'template': { type: 'string' },
  'yes': { type: 'boolean', default: false },
  'no-install': { type: 'boolean', default: false },
  'no-boot': { type: 'boolean', default: false },
  'no-git': { type: 'boolean', default: false },
  'github': { type: 'boolean', default: false },
  'help': { type: 'boolean', default: false },
}

/**
 * The usage of the installer, printed by `--help` and when the flags are wrong.
 */
export const USAGE = `
Usage:
  curl -fsSL https://raw.githubusercontent.com/Dash-AI-Tools/dash-starter/main/install.sh | bash -s -- [directory] [options]

From a clone of the template:
  node packages/create-app/bin/create-dash-starter.js [directory] --template . [options]

Options:
  --name <name>          Product name, e.g. "Acme AI"
  --slug <slug>          Kebab-case slug, e.g. acme-ai
  --description <text>   One-line description
  --locale <en|es>       Default locale
  --palette <id>         Default color palette: line, ink, ocean, forest, plum or ember
  --email <address>      Support email
  --template <path|url>  Use a local directory instead of the published release
  --yes                  Accept every default without prompting
  --no-install           Skip \`npm install\`
  --no-boot              Skip \`docker compose up\`
  --no-git               Skip \`git init\`
  --github               Create a private GitHub repository with \`gh\`
  --help                 Print this message
`

/**
 * Reads the arguments of the command line.
 */
export function parseCli(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: OPTIONS,
  })

  return {
    ...values,
    directory: positionals[0],
  }
}
