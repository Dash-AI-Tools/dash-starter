import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  applyLocale,
  applyPalette,
  generateEnvFiles,
  generateKey,
  generateSecret,
  setEnvValue,
} from '../src/env.js'

const identity = {
  name: 'Acme AI',
  slug: 'acme-ai',
  description: 'A product',
  locale: 'es',
  email: 'hi@acme.test',
}

test('a variable of an environment file is set', () => {
  const content = 'APP_KEY=\nOTHER=1\n'

  assert.equal(setEnvValue(content, 'APP_KEY', 'abc'), 'APP_KEY=abc\nOTHER=1\n')
  assert.equal(setEnvValue(content, 'NEW', 'abc'), 'APP_KEY=\nOTHER=1\nNEW=abc\n')
})

test('every secret is different', () => {
  const keys = new Set(Array.from({ length: 20 }, () => generateKey()))
  const secrets = new Set(Array.from({ length: 20 }, () => generateSecret()))

  assert.equal(keys.size, 20)
  assert.equal(secrets.size, 20)
  assert.equal(keys.has('ci-only-0123456789abcdef0123456789abcdef'), false)
})

test('the environment files are written from the examples', async () => {
  const root = await mkdtemp(join(tmpdir(), 'create-app-env-'))

  await writeFile(
    join(root, '.env.example'),
    'APP_KEY=\nAPP_URL=http://localhost:5173\nSUPPORT_EMAIL=support@dash-starter.test\nDEMO_MODE=true\n'
  )
  await mkdir(join(root, 'apps/api'), { recursive: true })
  await writeFile(
    join(root, 'apps/api/.env.example'),
    [
      'APP_KEY=',
      'DEFAULT_LOCALE=en',
      'MAIL_FROM=Dash <no-reply@dash-starter.test>',
      'MAIL_FROM_NAME=Dash',
      'CREEM_WEBHOOK_SECRET=',
      'CREEM_API_KEY=',
      'BREVO_API_KEY=',
      'AI_PROVIDER=stub',
      'ANTHROPIC_API_KEY=',
      '',
    ].join('\n')
  )

  const secrets = { appKey: generateKey(), webhookSecret: generateSecret() }

  await generateEnvFiles(root, { identity, secrets, options: {} })

  const rootEnv = await readFile(join(root, '.env'), 'utf8')
  const apiEnv = await readFile(join(root, 'apps/api/.env'), 'utf8')

  assert.match(rootEnv, new RegExp(`APP_KEY=${secrets.appKey}`))
  assert.match(rootEnv, /SUPPORT_EMAIL=hi@acme.test/)
  assert.match(rootEnv, /^DEMO_MODE=false$/m)
  assert.match(await readFile(join(root, '.env.example'), 'utf8'), /^DEMO_MODE=false$/m)
  assert.match(apiEnv, new RegExp(`APP_KEY=${secrets.appKey}`))
  assert.match(apiEnv, /DEFAULT_LOCALE=es/)
  assert.match(apiEnv, /MAIL_FROM=Acme AI <no-reply@acme.test>/)
  assert.match(apiEnv, /MAIL_FROM_NAME=Acme AI/)
  assert.match(apiEnv, new RegExp(`CREEM_WEBHOOK_SECRET=${secrets.webhookSecret}`))
  assert.match(apiEnv, /CREEM_API_KEY=\n/)
  assert.match(apiEnv, /BREVO_API_KEY=\n/)
  assert.match(apiEnv, /AI_PROVIDER=stub/)
})

test('the keys of the providers land in their place', async () => {
  const root = await mkdtemp(join(tmpdir(), 'create-app-env-'))

  await writeFile(join(root, '.env.example'), 'APP_KEY=\n')
  await mkdir(join(root, 'apps/api'), { recursive: true })
  await writeFile(
    join(root, 'apps/api/.env.example'),
    'APP_KEY=\nAI_PROVIDER=stub\nANTHROPIC_API_KEY=\n'
  )

  await generateEnvFiles(root, {
    identity,
    secrets: { appKey: generateKey(), webhookSecret: generateSecret() },
    options: { aiProvider: 'anthropic', aiKey: 'sk-ant-123' },
  })

  const apiEnv = await readFile(join(root, 'apps/api/.env'), 'utf8')

  assert.match(apiEnv, /AI_PROVIDER=anthropic/)
  assert.match(apiEnv, /ANTHROPIC_API_KEY=sk-ant-123/)
})

test('the web app points at the locale of the product', async () => {
  const root = await mkdtemp(join(tmpdir(), 'create-app-locale-'))

  await mkdir(join(root, 'apps/web/src/lib'), { recursive: true })
  await writeFile(
    join(root, 'apps/web/src/lib/i18n.tsx'),
    "export const DEFAULT_LOCALE: Locale = 'en'\n"
  )

  await applyLocale(root, 'es')

  const content = await readFile(join(root, 'apps/web/src/lib/i18n.tsx'), 'utf8')

  assert.match(content, /export const DEFAULT_LOCALE: Locale = 'es'/)
})

test('the web app shows the palette of the product', async () => {
  const root = await mkdtemp(join(tmpdir(), 'create-app-palette-'))

  await mkdir(join(root, 'apps/web/src/lib'), { recursive: true })
  await writeFile(
    join(root, 'apps/web/src/lib/palettes.ts'),
    "export const DEFAULT_PALETTE: PaletteId = 'line'\n"
  )

  await applyPalette(root, 'ocean')

  const content = await readFile(join(root, 'apps/web/src/lib/palettes.ts'), 'utf8')

  assert.match(content, /export const DEFAULT_PALETTE: PaletteId = 'ocean'/)
})
