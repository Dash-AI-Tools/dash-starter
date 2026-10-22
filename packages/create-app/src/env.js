import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * The variable of every provider of the AI registry, so the key of a provider
 * lands in the right place of the environment.
 */
export const AI_KEYS = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  qwen: 'QWEN_API_KEY',
  kimi: 'KIMI_API_KEY',
  glm: 'GLM_API_KEY',
  ollama: 'OLLAMA_API_KEY',
  compatible: 'COMPATIBLE_API_KEY',
}

/**
 * A secret of 32 bytes, in base64url. It signs the sessions and the cookies
 * of the product.
 */
export function generateKey() {
  return randomBytes(32).toString('base64url')
}

/**
 * A secret of 32 bytes, in hexadecimal. It signs the webhooks of the payment
 * provider.
 */
export function generateSecret() {
  return randomBytes(32).toString('hex')
}

/**
 * Sets the value of a variable of an environment file, or appends it when the
 * file does not have it.
 */
export function setEnvValue(content, key, value) {
  const line = new RegExp(`^${key}=.*$`, 'm')

  if (line.test(content)) {
    return content.replace(line, `${key}=${value}`)
  }

  return `${content.trimEnd()}\n${key}=${value}\n`
}

/**
 * The domain of the support address, used by the sender of the emails.
 */
function domainOf(email) {
  return email.split('@')[1] ?? 'localhost'
}

/**
 * Writes the environment files of a project from the examples of the
 * template, with the secrets of the project and the keys the developer gave.
 */
export async function generateEnvFiles(root, { identity, secrets, options = {} }) {
  const rootExample = await readFile(join(root, '.env.example'), 'utf8')
  const apiExample = await readFile(join(root, 'apps/api/.env.example'), 'utf8')

  let rootEnv = setEnvValue(rootExample, 'APP_KEY', secrets.appKey)
  rootEnv = setEnvValue(rootEnv, 'SUPPORT_EMAIL', identity.email)
  // The palette picker is a showcase of the template: new projects start
  // without it and show their own palette to every visitor.
  rootEnv = setEnvValue(rootEnv, 'DEMO_MODE', 'false')

  let apiEnv = setEnvValue(apiExample, 'APP_KEY', secrets.appKey)
  apiEnv = setEnvValue(apiEnv, 'DEFAULT_LOCALE', identity.locale)
  apiEnv = setEnvValue(
    apiEnv,
    'MAIL_FROM',
    `${identity.name} <no-reply@${domainOf(identity.email)}>`
  )
  apiEnv = setEnvValue(apiEnv, 'MAIL_FROM_NAME', identity.name)
  apiEnv = setEnvValue(apiEnv, 'CREEM_WEBHOOK_SECRET', secrets.webhookSecret)
  apiEnv = setEnvValue(apiEnv, 'CREEM_API_KEY', options.creemKey ?? '')
  apiEnv = setEnvValue(apiEnv, 'BREVO_API_KEY', options.brevoKey ?? '')

  if (options.aiProvider && options.aiKey) {
    apiEnv = setEnvValue(apiEnv, 'AI_PROVIDER', options.aiProvider)
    apiEnv = setEnvValue(apiEnv, AI_KEYS[options.aiProvider] ?? 'COMPATIBLE_API_KEY', options.aiKey)
  } else {
    apiEnv = setEnvValue(apiEnv, 'AI_PROVIDER', 'stub')
  }

  await writeFile(join(root, '.env'), rootEnv)
  // The example is what a teammate copies later: it keeps demo mode off too.
  await writeFile(join(root, '.env.example'), setEnvValue(rootExample, 'DEMO_MODE', 'false'))
  await writeFile(join(root, 'apps/api/.env'), apiEnv)

  return { root: rootEnv, api: apiEnv }
}

/**
 * Points the web app at the locale of the product. The API reads it from the
 * environment and the web app keeps it in a constant.
 */
export async function applyLocale(root, locale) {
  const path = join(root, 'apps/web/src/lib/i18n.tsx')

  let content

  try {
    content = await readFile(path, 'utf8')
  } catch {
    return null
  }

  const replaced = content.replace(
    /export const DEFAULT_LOCALE: Locale = '[a-z]+'/,
    `export const DEFAULT_LOCALE: Locale = '${locale}'`
  )

  if (replaced !== content) {
    await writeFile(path, replaced)
  }

  return replaced
}

/**
 * Sets the palette every visitor of the product sees, in the constant the web
 * app reads it from.
 */
export async function applyPalette(root, palette) {
  const path = join(root, 'apps/web/src/lib/palettes.ts')

  let content

  try {
    content = await readFile(path, 'utf8')
  } catch {
    return null
  }

  const replaced = content.replace(
    /export const DEFAULT_PALETTE: PaletteId = '[a-z]+'/,
    `export const DEFAULT_PALETTE: PaletteId = '${palette}'`
  )

  if (replaced !== content) {
    await writeFile(path, replaced)
  }

  return replaced
}
