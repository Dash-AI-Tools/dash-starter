import assert from 'node:assert/strict'
import test from 'node:test'

import {
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
      email: 'hi@acme.test',
    },
    manifest
  )

  assert.deepEqual(identity, {
    name: 'Acme AI',
    slug: 'acme-ai',
    description: 'A product',
    locale: 'es',
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
})
