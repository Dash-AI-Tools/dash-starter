import assert from 'node:assert/strict'
import test from 'node:test'
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'

import { createTemplate } from './fixture.js'

const INSTALLER = fileURLToPath(new URL('..', import.meta.url))
const ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const SCRIPT = join(ROOT, 'install.sh')
const VERSION = JSON.parse(readFileSync(join(INSTALLER, 'package.json'), 'utf8')).version

const REPO = 'Dash-AI-Tools/dash-starter'
const LATEST = `https://github.com/${REPO}/releases/tag/v${VERSION}`

/**
 * The stand-in of curl: it answers the redirect of the latest release with
 * `STUB_LATEST` and the archive of `STUB_VERSION` with `STUB_TARBALL`, logs
 * every address and fails like `curl -f` on anything else.
 */
const CURL = `#!/bin/bash
out=''
url=''
while (($#)); do
  case "$1" in
    -o) out="$2"; shift 2 ;;
    https://*) url="$1"; shift ;;
    *) shift ;;
  esac
done
printf '%s\\n' "$url" >>"$STUB_LOG"
case "$url" in
  */releases/latest)
    [[ -n "\${STUB_LATEST:-}" ]] || exit 22
    printf '%s' "$STUB_LATEST" ;;
  */archive/refs/tags/v"$STUB_VERSION".tar.gz)
    [[ "$out" == /dev/null ]] || cp "$STUB_TARBALL" "$out" ;;
  *) exit 22 ;;
esac
`

/**
 * The stand-in of npm: the dependencies of the installer are the ones of this
 * repository, so the tests need no network. `node_modules` is a directory, as
 * npm leaves it, so the installer leaves it out of the project.
 */
const NPM = `#!/bin/bash
printf 'npm %s\\n' "$*" >>"$STUB_LOG"
mkdir node_modules
ln -s "$STUB_NODE_MODULES"/* node_modules/
`

/**
 * Packs a release the way GitHub does: the template of the fixture with the
 * real installer inside, under one top-level directory.
 */
async function createRelease({ nvmrc = process.versions.node, installerVersion = VERSION } = {}) {
  const template = await createTemplate()
  const installer = join(template, 'packages/create-app')

  for (const entry of ['bin', 'src', 'template.json']) {
    await cp(join(INSTALLER, entry), join(installer, entry), { recursive: true })
  }

  const manifest = JSON.parse(await readFile(join(INSTALLER, 'package.json'), 'utf8'))

  await writeFile(
    join(installer, 'package.json'),
    `${JSON.stringify({ ...manifest, version: installerVersion }, null, 2)}\n`
  )
  await writeFile(join(template, '.nvmrc'), `${nvmrc}\n`)

  const archive = join(await mkdtemp(join(tmpdir(), 'install-sh-release-')), 'release.tar.gz')
  const packed = spawnSync('tar', ['-czf', archive, '-C', dirname(template), basename(template)])

  assert.equal(packed.status, 0, packed.stderr?.toString())

  return archive
}

/**
 * A place to run the script: the directory of the developer, a TMPDIR the
 * test can inspect and a PATH with the stand-ins first.
 */
async function createSandbox(release) {
  const sandbox = await mkdtemp(join(tmpdir(), 'install-sh-'))
  const stubs = join(sandbox, 'bin')
  const cwd = join(sandbox, 'cwd')
  const temp = join(sandbox, 'tmp')

  await mkdir(stubs)
  await mkdir(cwd)
  await mkdir(temp)
  await writeFile(join(stubs, 'curl'), CURL, { mode: 0o755 })
  await writeFile(join(stubs, 'npm'), NPM, { mode: 0o755 })

  const env = { ...process.env }

  delete env.DASH_VERSION
  delete env.DASH_TEMPLATE_REPO

  return {
    cwd,
    temp,
    stubs,
    log: join(sandbox, 'calls.log'),
    env: {
      ...env,
      PATH: `${stubs}:${process.env.PATH}`,
      TMPDIR: temp,
      STUB_LOG: join(sandbox, 'calls.log'),
      STUB_LATEST: LATEST,
      STUB_VERSION: VERSION,
      STUB_TARBALL: release,
      STUB_NODE_MODULES: join(ROOT, 'node_modules'),
    },
  }
}

/**
 * Runs the script in its own session, so it has no terminal, like in CI.
 */
function install(sandbox, args, env = {}) {
  return new Promise((resolve) => {
    const child = spawn('/bin/bash', [SCRIPT, ...args], {
      cwd: sandbox.cwd,
      env: { ...sandbox.env, ...env },
      detached: true,
    })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

async function calls(sandbox) {
  try {
    return await readFile(sandbox.log, 'utf8')
  } catch {
    return ''
  }
}

async function exists(path) {
  try {
    await readdir(path)
    return true
  } catch {
    return false
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

const FLAGS = [
  '--name',
  'Acme AI',
  '--slug',
  'acme-ai',
  '--locale',
  'es',
  '--yes',
  '--no-install',
  '--no-boot',
  '--no-git',
]

const release = await createRelease()

test('the script generates the project from the latest release with the flags it is given', async () => {
  const sandbox = await createSandbox(release)

  const result = await install(sandbox, ['my-product', ...FLAGS])

  assert.equal(result.code, 0, result.stderr)

  const project = join(sandbox.cwd, 'my-product')
  const metadata = await readJson(join(project, '.dash/install.json'))
  const core = await readJson(join(project, '.dash/core.json'))
  const i18n = await readFile(join(project, 'apps/web/src/lib/i18n.tsx'), 'utf8')

  assert.equal(metadata.identity.name, 'Acme AI')
  assert.equal(metadata.identity.slug, 'acme-ai')
  assert.match(i18n, /DEFAULT_LOCALE: Locale = 'es'/)
  assert.equal(core.version, VERSION)
  assert.equal(core.repository, `github:${REPO}`)
  assert.ok(await exists(join(project, 'packages/core-tools')))
  assert.equal(await exists(join(project, 'packages/create-app')), false)
  await assert.rejects(() => readFile(join(project, 'install.sh')))

  const log = await calls(sandbox)

  assert.match(log, new RegExp(`github.com/${REPO}/releases/latest`))
  assert.match(log, new RegExp(`archive/refs/tags/v${VERSION}.tar.gz`))
  assert.match(log, /npm ci --workspace create-dash-starter --omit=dev --ignore-scripts/)
  assert.doesNotMatch(log, /npm install/)
})

test('the download is removed after a successful run', async () => {
  const sandbox = await createSandbox(release)

  const result = await install(sandbox, ['my-product', ...FLAGS])

  assert.equal(result.code, 0, result.stderr)
  assert.deepEqual(await readdir(sandbox.temp), [])
})

test('a directory with files is refused and the download is removed', async () => {
  const sandbox = await createSandbox(release)
  const project = join(sandbox.cwd, 'my-product')

  await mkdir(project)
  await writeFile(join(project, 'notes.txt'), 'mine\n')

  const result = await install(sandbox, ['my-product', ...FLAGS])

  assert.notEqual(result.code, 0)
  assert.match(result.stderr, /not empty/)
  assert.deepEqual(await readdir(project), ['notes.txt'])
  assert.deepEqual(await readdir(sandbox.temp), [])
})

test('DASH_VERSION pins the release without asking for the latest', async () => {
  const sandbox = await createSandbox(release)

  const result = await install(sandbox, ['my-product', ...FLAGS], {
    DASH_VERSION: `v${VERSION}`,
    STUB_LATEST: '',
  })

  assert.equal(result.code, 0, result.stderr)

  const core = await readJson(join(sandbox.cwd, 'my-product/.dash/core.json'))
  const log = await calls(sandbox)

  assert.equal(core.version, VERSION)
  assert.doesNotMatch(log, /releases\/latest/)
})

for (const repository of ['github:acme/starter', 'acme/starter']) {
  test(`DASH_TEMPLATE_REPO=${repository} downloads from the fork and records it`, async () => {
    const sandbox = await createSandbox(release)

    const result = await install(sandbox, ['my-product', ...FLAGS], {
      DASH_TEMPLATE_REPO: repository,
      STUB_LATEST: `https://github.com/acme/starter/releases/tag/v${VERSION}`,
    })

    assert.equal(result.code, 0, result.stderr)

    const core = await readJson(join(sandbox.cwd, 'my-product/.dash/core.json'))
    const log = await calls(sandbox)

    assert.equal(core.repository, 'github:acme/starter')
    assert.match(log, /github.com\/acme\/starter\/archive\/refs\/tags/)
    assert.doesNotMatch(log, new RegExp(REPO))
  })
}

test('a repository without a release stops before creating anything', async () => {
  const sandbox = await createSandbox(release)

  const result = await install(sandbox, ['my-product', ...FLAGS], {
    STUB_LATEST: `https://github.com/${REPO}/releases`,
  })

  assert.equal(result.code, 1)
  assert.match(result.stderr, new RegExp(`github.com/${REPO} has no published release`))
  assert.equal(await exists(join(sandbox.cwd, 'my-product')), false)
})

test('a version that does not exist stops before creating anything and leaves no download', async () => {
  const sandbox = await createSandbox(release)

  const result = await install(sandbox, ['my-product', ...FLAGS], { DASH_VERSION: '9.9.9' })

  assert.equal(result.code, 1)
  assert.match(result.stderr, new RegExp(`v9.9.9 of github.com/${REPO}`))
  assert.equal(await exists(join(sandbox.cwd, 'my-product')), false)
  assert.deepEqual(await readdir(sandbox.temp), [])
})

test('a release whose installer has another version is refused', async () => {
  const sandbox = await createSandbox(await createRelease({ installerVersion: '0.0.1' }))

  const result = await install(sandbox, ['my-product', ...FLAGS])

  assert.equal(result.code, 1)
  assert.match(result.stderr, /carries the installer 0\.0\.1/)
  assert.equal(await exists(join(sandbox.cwd, 'my-product')), false)
})

test('a missing tool is named before anything is downloaded', async () => {
  const sandbox = await createSandbox(release)

  const result = await install(sandbox, ['my-product', ...FLAGS], { PATH: sandbox.stubs })

  assert.equal(result.code, 1)
  assert.match(result.stderr, /"node" is required/)
  assert.equal(await calls(sandbox), '')
  assert.equal(await exists(join(sandbox.cwd, 'my-product')), false)
})

test('a Node older than the .nvmrc of the release is refused', async () => {
  const sandbox = await createSandbox(await createRelease({ nvmrc: '999.0.0' }))

  const result = await install(sandbox, ['my-product', ...FLAGS])

  assert.equal(result.code, 1)
  assert.match(result.stderr, /Node 999\.0\.0 or newer is required/)
  assert.match(result.stderr, new RegExp(`v${process.versions.node}`))
  assert.match(result.stderr, /nvm install 999\.0\.0/)
  assert.equal(await exists(join(sandbox.cwd, 'my-product')), false)
})

test('without a terminal the script needs --yes before it downloads anything', async () => {
  const sandbox = await createSandbox(release)

  const result = await install(sandbox, ['my-product', '--name', 'Acme AI'])

  assert.equal(result.code, 1)
  assert.match(result.stderr, /no terminal.*--yes/)
  assert.equal(await calls(sandbox), '')
  assert.equal(await exists(join(sandbox.cwd, 'my-product')), false)
})

/**
 * The questions the installer still asks when the flags answer the identity
 * and the steps.
 */
const QUESTIONS = ['Brevo key', 'Creem key', 'real AI provider']

/**
 * Python runs the pipe inside a pseudo-terminal and copies its own input, a
 * pipe of Node, into it. The script(1) of macOS refuses a pipe or a FIFO as
 * its input, so it cannot play this part. macOS and the runners of CI have
 * python3.
 */
const PTY = 'import pty, sys; sys.exit(pty.spawn(sys.argv[1:]) >> 8)'

const hasPython = spawnSync('python3', ['-c', 'import pty']).status === 0

test(
  'through a pipe, the prompts read the terminal',
  { skip: !hasPython && 'python3 is not available', timeout: 60_000 },
  async () => {
    const sandbox = await createSandbox(release)
    /**
     * A new pseudo-terminal has no width, and the prompts wrap at every
     * character without one.
     */
    const command = [
      'stty cols 120 rows 40;',
      `cat '${SCRIPT}' | /bin/bash -s -- my-product`,
      "--name 'Acme AI' --slug acme-ai --description 'An AI product' --locale en",
      '--palette line --email hi@acme.test --no-install --no-boot --no-git',
    ].join(' ')

    const child = spawn('python3', ['-c', PTY, '/bin/bash', '-c', command], {
      cwd: sandbox.cwd,
      env: sandbox.env,
    })
    const answered = new Set()
    let output = ''

    /**
     * A prompt nobody answers would keep the test waiting forever.
     */
    const timer = setTimeout(() => child.kill('SIGKILL'), 45_000)

    child.stdout.on('data', (chunk) => {
      output += chunk
      const text = stripVTControlCharacters(output)

      for (const question of QUESTIONS) {
        if (!answered.has(question) && text.includes(question)) {
          answered.add(question)
          child.stdin.write('n')
        }
      }
    })

    const code = await new Promise((resolve) => child.on('close', resolve))

    clearTimeout(timer)

    assert.deepEqual([...answered], QUESTIONS, output)
    assert.equal(code, 0, output)

    const metadata = await readJson(join(sandbox.cwd, 'my-product/.dash/install.json'))

    assert.equal(metadata.identity.name, 'Acme AI')
  }
)
