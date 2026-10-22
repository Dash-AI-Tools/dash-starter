/**
 * The locales the product ships with.
 */
export const LOCALES = ['en', 'es']

/**
 * The shape of a slug: lowercase words joined with dashes.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * The shape of an email address.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Whether a slug can be used as a directory, a package scope and a database
 * name.
 */
export function isValidSlug(slug) {
  return SLUG_PATTERN.test(slug)
}

/**
 * Whether an address can be the support contact of the product.
 */
export function isValidEmail(email) {
  return EMAIL_PATTERN.test(email)
}

/**
 * Turns a product name into a slug: "Acme AI" becomes "acme-ai".
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * The values of the identity that every replacement of the template reads.
 * The scope, the code names and the storage folder are derived from the slug,
 * so a rebranded project never keeps the name of the template.
 */
export function buildValues(identity) {
  const code = identity.slug.replace(/-/g, '_')

  return {
    name: identity.name,
    slug: identity.slug,
    description: identity.description,
    email: identity.email,
    scope: `@${identity.slug}/`,
    code,
    codeTest: `${code}_test`,
    storage: `${identity.slug}-storage`,
    storageTest: `${identity.slug}-test-storage`,
    consent: `${code}_consent`,
    prefix: `${code}_`,
  }
}

/**
 * The default support address of a project. The manifest writes it with the
 * slug of the product, so every project gets its own address.
 */
export function defaultEmail(manifest, slug) {
  return manifest.identity.email.default.replace('{slug}', slug)
}

/**
 * Merges the answers of the prompts with the flags and the defaults of the
 * manifest, and refuses the values that would break the project.
 */
export function resolveIdentity(input, manifest) {
  const defaults = manifest.identity

  const slug = input.slug ?? defaults.slug.default

  const identity = {
    name: input.name ?? defaults.name.default,
    slug,
    description: input.description ?? defaults.description.default,
    locale: input.locale ?? defaults.locale.default,
    email: input.email ?? defaultEmail(manifest, slug),
  }

  if (!identity.name.trim()) {
    throw new Error('The product name cannot be empty')
  }

  if (!isValidSlug(identity.slug)) {
    throw new Error(
      `The slug "${identity.slug}" is not valid: it must be lowercase kebab-case, e.g. "acme-ai"`
    )
  }

  if (!LOCALES.includes(identity.locale)) {
    throw new Error(`The locale "${identity.locale}" is not supported: use "en" or "es"`)
  }

  if (!isValidEmail(identity.email)) {
    throw new Error(`The email "${identity.email}" is not a valid address`)
  }

  return identity
}
