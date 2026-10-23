import { cancel, confirm, isCancel, select, text } from '@clack/prompts'

import { AI_KEYS } from './env.js'
import { defaultEmail, isValidEmail, isValidSlug, LOCALES, PALETTES } from './identity.js'

/**
 * The providers of the AI registry that the installer can configure.
 */
const AI_PROVIDERS = Object.keys(AI_KEYS)

/**
 * Thrown when the developer closes the installer with Ctrl+C.
 */
export class Cancelled extends Error {}

/**
 * Waits for the answer of a question of the installer and refuses the
 * cancellation. The question is the prompt itself, already on screen.
 */
async function ask(question) {
  const answer = await question

  if (isCancel(answer)) {
    cancel('The installation was cancelled.')
    throw new Cancelled('The installation was cancelled')
  }

  return answer
}

/**
 * Asks for the identity of the product. The flags answer the questions
 * before they are asked, and `--yes` accepts the defaults of the manifest.
 */
export async function askIdentity(manifest, { flags, yes }) {
  const defaults = manifest.identity

  const name =
    flags.name ??
    (yes
      ? defaults.name.default
      : await ask(
          text({
            message: 'Product name',
            initialValue: defaults.name.default,
            validate: (value) => (value.trim() ? undefined : 'The name cannot be empty'),
          })
        ))

  const slug =
    flags.slug ??
    (yes
      ? defaults.slug.default
      : await ask(
          text({
            message: 'Project slug',
            initialValue: defaults.slug.default,
            validate: (value) =>
              isValidSlug(value) ? undefined : 'The slug must be lowercase kebab-case',
          })
        ))

  const description =
    flags.description ??
    (yes
      ? defaults.description.default
      : await ask(
          text({
            message: 'One-line description',
            initialValue: defaults.description.default,
          })
        ))

  const locale =
    flags.locale ??
    (yes
      ? defaults.locale.default
      : await ask(
          select({
            message: 'Default locale',
            initialValue: defaults.locale.default,
            options: LOCALES.map((value) => ({ value, label: value })),
          })
        ))

  const palette =
    flags.palette ??
    (yes
      ? defaults.palette.default
      : await ask(
          select({
            message: 'Default color palette',
            initialValue: defaults.palette.default,
            options: PALETTES.map((value) => ({ value, label: value })),
          })
        ))

  const email =
    flags.email ??
    (yes
      ? defaultEmail(manifest, slug)
      : await ask(
          text({
            message: 'Support email',
            initialValue: defaultEmail(manifest, slug),
            validate: (value) => (isValidEmail(value) ? undefined : 'The email is not valid'),
          })
        ))

  return { name, slug, description, locale, palette, email }
}

/**
 * Asks for the keys of the providers. A key that is not given is left empty,
 * so the project boots with the local fallbacks.
 */
export async function askProviderKeys({ yes }) {
  if (yes) {
    return { brevoKey: '', creemKey: '', aiProvider: '', aiKey: '' }
  }

  const brevo = await ask(
    confirm({
      message: 'Do you want to add your Brevo key now? (the local mail catcher is used without it)',
    })
  )

  const brevoKey = brevo
    ? await ask(text({ message: 'Brevo API key', placeholder: 'xkeysib-...' }))
    : ''

  const creem = await ask(
    confirm({
      message: 'Do you want to add your Creem key now? (the test mode is used without it)',
    })
  )

  const creemKey = creem ? await ask(text({ message: 'Creem API key' })) : ''

  const ai = await ask(
    confirm({ message: 'Do you want to use a real AI provider now? (the stub answers without it)' })
  )

  let aiProvider = ''
  let aiKey = ''

  if (ai) {
    aiProvider = await ask(
      select({
        message: 'AI provider',
        options: AI_PROVIDERS.map((value) => ({ value, label: value })),
      })
    )

    aiKey = await ask(text({ message: 'API key of the provider' }))
  }

  return { brevoKey, creemKey, aiProvider, aiKey }
}

/**
 * Asks for the steps the developer wants the installer to run.
 */
export async function askOptions({ flags, yes }) {
  if (yes) {
    return {
      git: !flags['no-git'],
      github: flags.github,
      install: !flags['no-install'],
      boot: !flags['no-boot'],
    }
  }

  const git = flags['no-git']
    ? false
    : await ask(confirm({ message: 'Do you want a git repository with its first commit?' }))

  const github =
    git && flags.github
      ? true
      : git
        ? await ask(confirm({ message: 'Do you want a private repository in GitHub?' }))
        : false

  const install = flags['no-install']
    ? false
    : await ask(confirm({ message: 'Do you want to install the dependencies now?' }))

  const boot =
    !install || flags['no-boot']
      ? false
      : await ask(confirm({ message: 'Do you want to start the stack now?' }))

  return { git, github, install, boot }
}
