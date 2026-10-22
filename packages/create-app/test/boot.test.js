import assert from 'node:assert/strict'
import test from 'node:test'

import { bootStack, hasDocker, installDependencies } from '../src/boot.js'

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

test('the dependencies are installed in the project', async () => {
  const { run, calls } = fakeRun()

  await installDependencies('/tmp/project', { run })

  assert.deepEqual(calls, [{ command: 'npm', args: ['install'], cwd: '/tmp/project' }])
})

test('the stack is started and seeded', async () => {
  const { run, calls } = fakeRun()

  const result = await bootStack('/tmp/project', { run })

  assert.equal(result.ok, true)
  assert.deepEqual(
    calls.map((call) => call.args.join(' ')),
    [
      'compose up -d',
      'compose up -d --wait --wait-timeout 300',
      'compose exec -T api node ace db:seed',
    ]
  )
})

test('a stack that does not start stops the boot', async () => {
  const { run } = fakeRun({
    docker: (args) =>
      args[1] === 'up'
        ? { code: 1, output: '', error: null }
        : { code: 0, output: '', error: null },
  })

  const result = await bootStack('/tmp/project', { run })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'docker compose up failed')
})

test('a stack that never becomes healthy stops the boot', async () => {
  const { run } = fakeRun({
    docker: (args) =>
      args.includes('--wait')
        ? { code: 1, output: '', error: null }
        : { code: 0, output: '', error: null },
  })

  const result = await bootStack('/tmp/project', { run })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'the stack did not become healthy')
})

test('the seeds that fail stop the boot', async () => {
  const { run } = fakeRun({
    docker: (args) =>
      args.includes('db:seed')
        ? { code: 1, output: '', error: null }
        : { code: 0, output: '', error: null },
  })

  const result = await bootStack('/tmp/project', { run })

  assert.equal(result.ok, false)
  assert.equal(result.reason, 'the seeds failed')
})

test('docker is detected', async () => {
  const { run, calls } = fakeRun()

  assert.equal(await hasDocker({ run }), true)
  assert.equal(calls[0].command, 'docker')

  const missing = fakeRun({ docker: { code: 1, output: '', error: null } })

  assert.equal(await hasDocker({ run: missing.run }), false)
})
