import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ESLint } from 'eslint'

/**
 * The root of the project, where the scripts and the workflow live.
 */
const PROJECT_ROOT = app.makePath('..', '..')

/**
 * The root of the API, where the ESLint configuration lives.
 */
const APP_ROOT = app.makePath()

/**
 * Whether this checkout is the template itself. A generated project has no
 * installer, and the installer removes its job from the workflow.
 */
const IS_TEMPLATE = existsSync(join(PROJECT_ROOT, 'packages/create-app'))

/**
 * Reads a file of the project.
 */
async function readProjectFile(name: string): Promise<string> {
  return readFile(join(PROJECT_ROOT, name), 'utf-8')
}

/**
 * Reads the manifest of a workspace.
 */
async function readManifest(name: string): Promise<Record<string, any>> {
  return JSON.parse(await readProjectFile(name))
}

test.group('The tooling of the project', () => {
  test('fails the lint when a variable is not used', async ({ assert }) => {
    const eslint = new ESLint({ cwd: APP_ROOT })

    const [result] = await eslint.lintText('const unused = 1\n', {
      filePath: join(APP_ROOT, 'app', 'unused_probe.ts'),
    })

    const error = result.messages.find(
      (message) => message.ruleId === '@typescript-eslint/no-unused-vars'
    )

    assert.isDefined(error, 'the lint does not report the unused variable')
    assert.equal(error!.severity, 2)
    assert.include(error!.message, 'unused')
  }).timeout(20000)

  test('runs every check of every workspace from the root', async ({ assert }) => {
    const root = await readManifest('package.json')

    assert.include(root.scripts.lint, '--workspaces')
    assert.include(root.scripts.typecheck, '--workspaces')
    assert.include(root.scripts.test, '--workspaces')
    assert.include(root.scripts['format:check'], 'prettier')
    assert.include(root.scripts['test:e2e'], 'e2e')

    for (const workspace of ['apps/api/package.json', 'apps/web/package.json']) {
      const manifest = await readManifest(workspace)

      assert.isDefined(manifest.scripts.lint, `${workspace} has no lint script`)
      assert.isDefined(manifest.scripts.typecheck, `${workspace} has no typecheck script`)
      assert.isDefined(manifest.scripts.test, `${workspace} has no test script`)
    }

    const e2e = await readManifest('e2e/package.json')
    assert.isDefined(e2e.scripts['test:e2e'], 'the e2e package has no test script')
  })

  test('keeps the trace of a failed journey', async ({ assert }) => {
    const config = await readProjectFile('e2e/playwright.config.ts')

    assert.include(config, "trace: 'retain-on-failure'")
  })

  test('runs the tests and the journeys in the pipeline', async ({ assert }) => {
    const workflow = await readProjectFile('.github/workflows/ci.yml')

    /**
     * The pipeline runs the tests with a database and the journeys against
     * the stack, so a broken test stops the merge.
     */
    assert.include(workflow, 'run: npm test')
    assert.include(workflow, 'run: npm run test:e2e')
    assert.include(workflow, 'image: postgres:17-alpine')
    assert.include(workflow, 'run: npm run lint')
    assert.include(workflow, 'run: npm run typecheck')
    assert.include(workflow, 'run: npm run format:check')
  })

  test('checks the installer in the pipeline', async ({ assert }) => {
    const workflow = await readProjectFile('.github/workflows/ci.yml')

    /**
     * The job generates a project with the installer and runs the checks of
     * the project, so a broken replacement is caught.
     */
    assert.include(workflow, 'create-dash-starter.js')
    assert.include(workflow, 'run: shellcheck install.sh')
    assert.include(workflow, 'Lint, type-check and test the project')
  }).skip(!IS_TEMPLATE, 'A generated project has no installer job')
})
