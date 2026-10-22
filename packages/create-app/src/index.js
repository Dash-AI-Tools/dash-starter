import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import { parseCli, USAGE } from './cli.js'
import { readManifest, readInstallerVersion } from './manifest.js'
import { buildValues, resolveIdentity } from './identity.js'
import { DEFAULT_TEMPLATE_REPO, fetchTemplate } from './fetch.js'
import { applyReplacements, applyRemovals, removePaths, removeWorkflowJobs } from './replace.js'
import { applyLocale, applyPalette, generateEnvFiles, generateKey, generateSecret } from './env.js'
import { createRemote, initRepository } from './git.js'
import { bootStack, hasDocker, installDependencies } from './boot.js'
import { run as shell } from './shell.js'
import { askIdentity, askOptions, askProviderKeys, Cancelled } from './prompts.js'

/**
 * The addresses of a generated project, the same ones the Compose file
 * publishes.
 */
const URLS = {
  web: 'http://localhost:5173',
  api: 'http://localhost:3333',
  mailpit: 'http://localhost:8025',
}

/**
 * A directory can only be used when it does not exist or when it is empty.
 */
export async function assertEmptyDirectory(target) {
  let entries

  try {
    entries = await readdir(target)
  } catch {
    return true
  }

  if (entries.length > 0) {
    throw new Error(
      `The directory "${target}" is not empty. The installer needs an empty or a new directory`
    )
  }

  return true
}

/**
 * Creates a new product from the template.
 */
export async function run(argv, options = {}) {
  const runCommand = options.run ?? shell
  const logger = options.log ?? console.log

  let cli

  try {
    cli = parseCli(argv)
  } catch (error) {
    logger(error.message)
    logger(USAGE)
    return 1
  }

  if (cli.help) {
    logger(USAGE)
    return 0
  }

  const manifest = options.manifest ?? (await readManifest())
  const version = options.version ?? (await readInstallerVersion())

  const answers = await askIdentity(manifest, { flags: cli, yes: cli.yes })
  const identity = resolveIdentity(answers, manifest)
  const values = buildValues(identity)

  const target = resolve(cli.directory ?? identity.slug)

  await assertEmptyDirectory(target)

  const keys = await askProviderKeys({ yes: cli.yes })
  const steps = await askOptions({ flags: cli, yes: cli.yes })

  logger(`Fetching the template into ${target}...`)

  const dir = await fetchTemplate({
    template: cli.template,
    version,
    target,
    exclude: manifest.exclude,
    repo: process.env.DASH_TEMPLATE_REPO ?? DEFAULT_TEMPLATE_REPO,
  })

  await applyRemovals(dir, {
    sections: manifest.removeSections,
    lines: manifest.removeLines,
  })
  await applyReplacements(dir, { tokens: manifest.tokens, values, exclude: manifest.exclude })
  await removePaths(dir, manifest.removePaths)
  await removeWorkflowJobs(dir, manifest.removeWorkflowJobs)
  await applyLocale(dir, identity.locale)
  await applyPalette(dir, identity.palette)

  await generateEnvFiles(dir, {
    identity,
    secrets: { appKey: generateKey(), webhookSecret: generateSecret() },
    options: keys,
  })

  /**
   * The dependencies come first: the lock file they write belongs to the
   * first commit, and the containers of the stack install the project with it.
   */
  let installed = true

  if (steps.install) {
    logger('Installing the dependencies...')
    const result = await installDependencies(dir, { run: runCommand })

    installed = result.code === 0

    if (!installed) {
      logger(
        'The dependencies could not be installed. Run "npm install" in the project and start the stack again.'
      )
    }
  }

  if (steps.git) {
    const repository = await initRepository(dir, { run: runCommand, identity })

    if (!repository.ok) {
      logger('The git repository was not initialized.')
    }

    if (steps.github) {
      const remote = await createRemote(dir, identity.slug, { run: runCommand })

      if (remote.ok) {
        logger(`The repository is in ${remote.url}`)
      } else {
        logger('The GitHub repository was not created. You can create it with:')
        logger(remote.manual)
      }
    }
  }

  let booted = false

  if (steps.boot && installed) {
    if (await hasDocker({ run: runCommand })) {
      logger('Starting the stack...')
      const stack = await bootStack(dir, { run: runCommand })

      booted = stack.ok

      if (!stack.ok) {
        logger(`The stack did not start: ${stack.reason}`)
      }
    } else {
      logger('Docker is not running, so the stack was not started.')
    }
  }

  logger('')
  logger(`${identity.name} is ready in ${target}`)
  logger('')
  logger(`  Web app   ${URLS.web}`)
  logger(`  API       ${URLS.api}`)
  logger(`  Mailpit   ${URLS.mailpit}`)
  logger('')
  logger('Next steps:')
  logger(`  cd ${target}`)

  if (!steps.install || !installed) {
    logger('  npm install')
  }

  if (!booted) {
    logger('  docker compose up -d')
    logger('  docker compose exec api node ace db:seed')
  }

  logger('  npm run dev')

  return 0
}

/**
 * The entry point of the command. It never throws: a failure is a message and
 * an exit code.
 */
export async function main(argv) {
  try {
    return await run(argv)
  } catch (error) {
    if (error instanceof Cancelled) {
      return 0
    }

    console.error(error.message)
    return 1
  }
}
