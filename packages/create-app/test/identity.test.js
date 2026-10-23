import assert from 'node:assert/strict'
import test from 'node:test'

import { readFile } from 'node:fs/promises'

import { askIdentity } from '../src/prompts.js'
import {
  PALETTES,
  buildValues,
  defaultEmail,
  isValidEmail,
  isValidSlug,
  resolveIdentity,
  slugify,
} from '../src/identity.js'

const manifest = {
  identity: {
    name: { default: 'Dash' },
    slug: { default: 'dash-starter' },
    description: { default: 'The AI SaaS starter for launching your next product' },
    locale: { default: 'en' },
    palette: { default: 'line' },
    email: { default: 'support@{slug}.test' },
  },
}

test('a slug is lowercase kebab-case', () => {
  assert.equal(isValidSlug('acme-ai'), true)
  assert.equal(isValidSlug('acme2'), true)
  assert.equal(isValidSlug('Acme-AI'), false)
  assert.equal(isValidSlug('acme_ai'), false)
  assert.equal(isValidSlug('-acme'), false)
  assert.equal(isValidSlug('acme-'), false)
  assert.equal(isValidSlug(''), false)
})

test('an email is an address', () => {
  assert.equal(isValidEmail('support@acme.test'), true)
  assert.equal(isValidEmail('support@acme'), false)
  assert.equal(isValidEmail('not an email'), false)
})

test('a name becomes a slug', () => {
  assert.equal(slugify('Acme AI'), 'acme-ai')
  assert.equal(slugify('Acme  AI Labs'), 'acme-ai-labs')
  assert.equal(slugify('Acción Digital'), 'accion-digital')
})

test('the identity falls back to the defaults of the manifest', () => {
  const identity = resolveIdentity({}, manifest)

  assert.equal(identity.name, 'Dash')
  assert.equal(identity.slug, 'dash-starter')
  assert.equal(identity.locale, 'en')
  assert.equal(identity.email, 'support@dash-starter.test')
})

test('the default email follows the slug', () => {
  const identity = resolveIdentity({ slug: 'acme-ai' }, manifest)

  assert.equal(identity.email, 'support@acme-ai.test')
  assert.equal(defaultEmail(manifest, 'acme-ai'), 'support@acme-ai.test')
})

test('the flags win over the defaults', () => {
  const identity = resolveIdentity(
    {
      name: 'Acme AI',
      slug: 'acme-ai',
      description: 'A product',
      locale: 'es',
      palette: 'ocean',
      email: 'hi@acme.test',
    },
    manifest
  )

  assert.deepEqual(identity, {
    name: 'Acme AI',
    slug: 'acme-ai',
    description: 'A product',
    locale: 'es',
    palette: 'ocean',
    email: 'hi@acme.test',
  })
})

test('an invalid identity is refused', () => {
  assert.throws(() => resolveIdentity({ slug: 'Acme' }, manifest), /kebab-case/)
  assert.throws(() => resolveIdentity({ locale: 'fr' }, manifest), /not supported/)
  assert.throws(() => resolveIdentity({ email: 'nope' }, manifest), /valid address/)
  assert.throws(() => resolveIdentity({ name: ' ' }, manifest), /cannot be empty/)
})

test('the values of the replacement are derived from the identity', () => {
  const values = buildValues({
    name: 'Acme AI',
    slug: 'acme-ai',
    description: 'A product',
    locale: 'en',
    email: 'hi@acme.test',
  })

  assert.equal(values.scope, '@acme-ai/')
  assert.equal(values.code, 'acme_ai')
  assert.equal(values.codeTest, 'acme_ai_test')
  assert.equal(values.storage, 'acme-ai-storage')
  assert.equal(values.storageTest, 'acme-ai-test-storage')
  assert.equal(values.consent, 'acme_ai_consent')
  assert.equal(values.prefix, 'acme_ai_')
  assert.equal(values.metadata, '.dash')
})

test('the palette defaults to line and refuses one that does not exist', () => {
  assert.equal(resolveIdentity({}, manifest).palette, 'line')
  assert.equal(resolveIdentity({ palette: 'ember' }, manifest).palette, 'ember')
  assert.throws(() => resolveIdentity({ palette: 'neon' }, manifest), /does not exist/)
})

test('the palettes of the installer are the ones of the web app', async () => {
  const source = await readFile(
    new URL('../../../apps/web/src/lib/palettes.ts', import.meta.url),
    'utf8'
  )
  const declared = /export const PALETTE_IDS = \[([^\]]+)\] as const/.exec(source)

  assert.ok(declared, 'PALETTE_IDS is declared in the web app')
  assert.deepEqual(
    declared[1].split(',').map((entry) => entry.trim().replace(/'/g, '')),
    PALETTES
  )
})

test('a flag answers the palette without asking', async () => {
  const answers = await askIdentity(manifest, {
    flags: {
      name: 'Acme AI',
      slug: 'acme-ai',
      description: 'An AI product',
      locale: 'en',
      palette: 'plum',
      email: 'hi@acme.test',
    },
    yes: false,
  })

  assert.equal(answers.palette, 'plum')
})
