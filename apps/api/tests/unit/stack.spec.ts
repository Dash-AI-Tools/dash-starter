import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * The root of the project, where the Compose files live.
 */
const PROJECT_ROOT = app.makePath('..', '..')

/**
 * Reads a file of the project.
 */
async function readProjectFile(name: string): Promise<string> {
  return readFile(join(PROJECT_ROOT, name), 'utf-8')
}

/**
 * How many times a piece of text appears in a file.
 */
function countOf(text: string, needle: string): number {
  return text.split(needle).length - 1
}

test.group('The stack of the project', () => {
  test('reloads the code of the developer without restarting the containers', async ({
    assert,
  }) => {
    const compose = await readProjectFile('docker-compose.yml')

    /**
     * The API watches the source and the web app is the Vite server, so a
     * change is served while the containers keep running.
     */
    assert.include(compose, 'node ace serve --hmr')
    assert.include(compose, 'npm run dev')

    /**
     * The source of both services is mounted from the host.
     */
    assert.isAbove(countOf(compose, '- .:/app'), 1)
  })

  test('serves the web app and the API from one origin', async ({ assert }) => {
    const nginx = await readProjectFile('apps/web/nginx.conf')

    /**
     * The browser only ever talks to the web origin: the proxy forwards the
     * API and the MCP server to the API container, so the cookies of the
     * session stay first-party.
     */
    assert.include(nginx, 'location /api/')
    assert.include(nginx, 'location /mcp')
    assert.isAbove(countOf(nginx, 'proxy_pass http://api:3333'), 1)
  })

  test('runs the migrations before the API accepts traffic', async ({ assert }) => {
    const dev = await readProjectFile('docker-compose.yml')
    const prod = await readProjectFile('docker-compose.prod.yml')

    assert.isBelow(dev.indexOf('migration:run'), dev.indexOf('serve --hmr'))
    assert.isBelow(prod.indexOf('migration:run'), prod.indexOf('node bin/server.js'))
  })
})
