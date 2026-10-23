import assert from 'node:assert/strict'
import test from 'node:test'

import { createRemote, initRepository } from '../src/git.js'

/**
 * A runner that records the calls and answers what the test needs.
 */
function fakeRun(answers = {}) {
  const calls = []

  const run = async (command, args = [], options = {}) => {
    calls.push({ command, args, cwd: options.cwd })

    for (const [key, answer] of Object.entries(answers)) {
      if (key === command) {
        return typeof answer === 'function' ? answer(args) : answer
      }
    }

    return { code: 0, output: '', error: null }
  }

  return { run, calls }
}

const identity = { name: 'Acme AI', slug: 'acme-ai', email: 'hi@acme.test' }

test('the repository is initialized and committed', async () => {
  const { run, calls } = fakeRun()

  const result = await initRepository('/tmp/project', { run, identity })

  assert.equal(result.ok, true)
  assert.deepEqual(
    calls.map((call) => call.args[0]),
    ['init', 'add', 'commit', 'log', 'config']
  )
  assert.deepEqual(calls[4].args, ['config', 'core.hooksPath', '.githooks'])
})

test('a machine without a git identity still commits', async () => {
  let commits = 0

  const run = async (command, args = []) => {
    if (command === 'git' && args[0] === 'commit') {
      commits++

      if (commits === 1) {
        return { code: 1, output: 'Please tell me who you are', error: null }
      }
    }

    if (command === 'git' && args[0] === 'config' && args[1] === 'user.email') {
      return { code: 1, output: '', error: null }
    }

    return { code: 0, output: '', error: null }
  }

  const result = await initRepository('/tmp/project', { run, identity })

  assert.equal(result.ok, true)
  assert.equal(commits, 2)
})

test('the remote is created in GitHub', async () => {
  const { run, calls } = fakeRun()

  const result = await createRemote('/tmp/project', 'acme-ai', { run })

  assert.equal(result.ok, true)
  assert.equal(calls[0].args[0], 'repo')
  assert.deepEqual(calls[0].args, [
    'repo',
    'create',
    'acme-ai',
    '--private',
    '--source',
    '.',
    '--push',
  ])
})

test('a machine without the GitHub CLI keeps the local repository', async () => {
  const { run } = fakeRun({ gh: { code: 1, output: 'gh: command not found', error: null } })

  const result = await createRemote('/tmp/project', 'acme-ai', { run })

  assert.equal(result.ok, false)
  assert.equal(result.manual, 'gh repo create acme-ai --private --source . --push')
})
