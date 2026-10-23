import assert from 'node:assert/strict'
import { mkdir, readdir } from 'node:fs/promises'
import test from 'node:test'

import { downloadRelease, parseRepository, resolveTarget, targetFromInput } from '../src/release.js'
import { REPOSITORY, network, tempDir, templateTree, writeTree } from './helpers.js'

test('only a GitHub repository over HTTPS is accepted', () => {
  assert.deepEqual(parseRepository('github:Dash-AI-Tools/dash-starter'), {
    owner: 'Dash-AI-Tools',
    name: 'dash-starter',
  })
  assert.deepEqual(parseRepository('https://github.com/acme/template.git'), {
    owner: 'acme',
    name: 'template',
  })

  for (const repository of [
    'http://github.com/acme/template',
    'gitlab:acme/template',
    'https://evil.test/acme/template',
    '../template',
    'github:acme/../template',
  ]) {
    assert.throws(() => parseRepository(repository), /is not supported/, repository)
  }
})

test('a version selects its tag and a ref is used as it is', () => {
  assert.deepEqual(targetFromInput('0.2.0'), { ref: 'v0.2.0', version: '0.2.0' })
  assert.deepEqual(targetFromInput('v0.2.0'), { ref: 'v0.2.0', version: '0.2.0' })
  assert.deepEqual(targetFromInput('main'), { ref: 'main', version: 'main' })

  for (const to of ['github:evil/repo', 'a..b', '-rf', 'https://evil.test', 'v1 v2']) {
    assert.throws(() => targetFromInput(to), /not a valid version or ref/, to)
  }
})

test('the latest release of the recorded repository is the default target', async () => {
  const { fetch, calls } = network({}, { tag: 'v0.3.1' })

  assert.deepEqual(await resolveTarget(REPOSITORY, undefined, { fetch }), {
    ref: 'v0.3.1',
    version: '0.3.1',
  })
  assert.deepEqual(calls.fetch, [
    'https://api.github.com/repos/Dash-AI-Tools/dash-starter/releases/latest',
  ])
})

test('--to skips the lookup of the latest release', async () => {
  const fetch = async () => assert.fail('no request expected')

  assert.deepEqual(await resolveTarget(REPOSITORY, '0.2.0', { fetch }), {
    ref: 'v0.2.0',
    version: '0.2.0',
  })
})

test('a failed or malformed lookup is reported', async () => {
  const answer = (response) => async () => response

  await assert.rejects(
    resolveTarget(REPOSITORY, undefined, {
      fetch: async () => {
        throw new Error('getaddrinfo ENOTFOUND api.github.com')
      },
    }),
    /could not be read: getaddrinfo ENOTFOUND/
  )
  await assert.rejects(
    resolveTarget(REPOSITORY, undefined, { fetch: answer({ ok: false, status: 404 }) }),
    /could not be read: HTTP 404/
  )
  await assert.rejects(
    resolveTarget(REPOSITORY, undefined, {
      fetch: answer({ ok: true, json: async () => JSON.parse('<html>') }),
    }),
    /is malformed: the answer is not JSON/
  )
  await assert.rejects(
    resolveTarget(REPOSITORY, undefined, { fetch: answer({ ok: true, json: async () => ({}) }) }),
    /is malformed: it has no tag/
  )
  await assert.rejects(
    resolveTarget(REPOSITORY, undefined, {
      fetch: answer({ ok: true, json: async () => ({ tag_name: 'github:evil/repo' }) }),
    }),
    /is malformed: "github:evil\/repo" is not a valid tag/
  )
})

test('a release of another repository is refused', async () => {
  const fetch = async () => ({
    ok: true,
    json: async () => ({
      tag_name: 'v9.9.9',
      html_url: 'https://github.com/evil/fork/releases/tag/v9.9.9',
    }),
  })

  await assert.rejects(resolveTarget(REPOSITORY, undefined, { fetch }), /does not belong to/)
})

test('a release is downloaded from the recorded repository into a temporary directory', async () => {
  const tmp = await tempDir()
  const { download, calls } = network(templateTree())

  const release = await downloadRelease(REPOSITORY, 'v0.2.0', { download, tmp })

  assert.deepEqual(calls.download, ['github:Dash-AI-Tools/dash-starter#v0.2.0'])
  assert.ok((await readdir(release.dir)).includes('package.json'))

  await release.cleanup()
  assert.deepEqual(await readdir(tmp), [])
})

test('a network failure removes the temporary directory', async () => {
  const tmp = await tempDir()
  const download = async (source, { dir }) => {
    await mkdir(dir, { recursive: true })
    await writeTree(dir, { 'half.txt': 'x' })
    throw new Error('socket hang up')
  }

  await assert.rejects(
    downloadRelease(REPOSITORY, 'v0.2.0', { download, tmp }),
    /could not be downloaded: socket hang up/
  )
  assert.deepEqual(await readdir(tmp), [])
})

test('a malformed release removes the temporary directory', async () => {
  const tmp = await tempDir()
  const { download } = network({ 'README.md': 'not a template' })

  await assert.rejects(
    downloadRelease(REPOSITORY, 'v0.2.0', { download, tmp }),
    /is malformed: it has no package\.json/
  )
  assert.deepEqual(await readdir(tmp), [])
})
