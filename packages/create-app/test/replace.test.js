import assert from 'node:assert/strict'
import test from 'node:test'

import { globToRegExp, isExcluded } from '../src/glob.js'
import { removeLines, removeSection, removeWorkflowJob } from '../src/replace.js'
import { compileTokens } from '../src/replace.js'

const tokens = {
  'The AI SaaS starter for launching your next product': 'description',
  'support@dash-starter.test': 'email',
  'dash-test-storage': 'storageTest',
  'dash-storage': 'storage',
  'dash_consent': 'consent',
  'dash_test': 'codeTest',
  'dash-starter': 'slug',
  'dash starter': 'name',
  'dash_': 'prefix',
  '@dash/': 'scope',
  'Dash': 'name',
  'dash': 'slug',
}

const values = {
  name: 'Acme AI',
  slug: 'acme-ai',
  description: 'A product',
  email: 'hi@acme.test',
  scope: '@acme-ai/',
  code: 'acme_ai',
  codeTest: 'acme_ai_test',
  storage: 'acme-ai-storage',
  storageTest: 'acme-ai-test-storage',
  consent: 'acme_ai_consent',
  prefix: 'acme_ai_',
}

const replace = (text) => compileTokens(tokens, values).replace(text)

test('the name of the template is replaced', () => {
  assert.equal(replace('Dash'), 'Acme AI')
  assert.equal(replace('MAIL_FROM_NAME=Dash'), 'MAIL_FROM_NAME=Acme AI')
  assert.equal(replace('# Dash Starter'), '# Acme AI')
})

test('the slug of the template is replaced', () => {
  assert.equal(replace('dash-starter'), 'acme-ai')
  assert.equal(replace('name: dash-starter-prod'), 'name: acme-ai-prod')
})

test('the namespace of the packages is replaced', () => {
  assert.equal(replace('"@dash/api"'), '"@acme-ai/api"')
  assert.equal(replace('@dash/web'), '@acme-ai/web')
})

test('the identifiers of the template are replaced', () => {
  assert.equal(replace('DB_DATABASE=dash_test'), 'DB_DATABASE=acme_ai_test')
  assert.equal(replace('DRIVE_ROOT=/tmp/dash-storage'), 'DRIVE_ROOT=/tmp/acme-ai-storage')
  assert.equal(replace("'dash_xxxxxxxx'"), "'acme_ai_xxxxxxxx'")
  assert.equal(replace('dash_consent'), 'acme_ai_consent')
})

test('the words that only look like the template are left alone', () => {
  assert.equal(replace('the dashboard of the product'), 'the dashboard of the product')
  assert.equal(replace('dashscope.aliyuncs.com'), 'dashscope.aliyuncs.com')
})

test('the bare name of the template is replaced', () => {
  assert.equal(replace('POSTGRES_USER: dash'), 'POSTGRES_USER: acme-ai')
  assert.equal(replace("MCP_SERVER_NAME = 'dash'"), "MCP_SERVER_NAME = 'acme-ai'")
})

test('the support email and the description are replaced', () => {
  assert.equal(replace('support@dash-starter.test'), 'hi@acme.test')
  assert.equal(replace('The AI SaaS starter for launching your next product'), 'A product')
})

test('a glob is turned into a regular expression', () => {
  assert.equal(globToRegExp('node_modules/**').test('node_modules/'), true)
  assert.equal(globToRegExp('node_modules/**').test('apps/api/node_modules/x'), false)
  assert.equal(globToRegExp('**/node_modules/**').test('apps/api/node_modules/x'), true)
  assert.equal(globToRegExp('**/dist/**').test('apps/web/dist/index.js'), true)
  assert.equal(globToRegExp('package-lock.json').test('package-lock.json'), true)
})

test('a path is excluded by its glob', () => {
  const patterns = ['node_modules/**', '**/node_modules/**', '**/dist/**']

  assert.equal(isExcluded('node_modules/', patterns), true)
  assert.equal(isExcluded('apps/api/node_modules/x', patterns), true)
  assert.equal(isExcluded('apps/api/app.ts', patterns), false)
})

test('the job of the template is removed from a workflow', () => {
  const workflow = [
    'name: CI',
    '',
    'jobs:',
    '  lint:',
    '    steps:',
    '      - run: npm run lint',
    '',
    '  installer:',
    '    steps:',
    '      - run: node packages/create-app/bin/create-dash-starter.js',
    '',
    '  test:',
    '    steps:',
    '      - run: npm test',
    '',
  ].join('\n')

  const result = removeWorkflowJob(workflow, 'installer')

  assert.equal(result.includes('installer'), false)
  assert.equal(result.includes('npm run lint'), true)
  assert.equal(result.includes('npm test'), true)
})

test('a section of a document is removed', () => {
  const document = [
    '# Title',
    '',
    '## The installer',
    '',
    'npx create-dash-starter my-product',
    '',
    '## Deployment',
    '',
    'docker compose up',
    '',
  ].join('\n')

  const result = removeSection(document, '## The installer')

  assert.equal(result.includes('create-dash-starter'), false)
  assert.equal(result.includes('## Deployment'), true)
  assert.equal(result.includes('# Title'), true)
})

test('the lines that mention a piece of text are removed', () => {
  const document = ['| `packages/create-app` | The installer |', '| `apps/api` | The API |'].join(
    '\n'
  )

  const result = removeLines(document, 'packages/create-app')

  assert.equal(result.includes('packages/create-app'), false)
  assert.equal(result.includes('apps/api'), true)
})
