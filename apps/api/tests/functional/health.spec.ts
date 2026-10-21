import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import type { PostgreConfig } from '@adonisjs/lucid/types/database'

/**
 * The health endpoint is unauthenticated and reports the readiness of the
 * process and of the database, so it can gate traffic in Compose.
 */
test.group('Health', () => {
  test('reports ok when the database is reachable', async ({ client, assert }) => {
    const response = await client.get('/api/v1/health')

    response.assertStatus(200)
    assert.equal(response.body().status, 'ok')
    assert.equal(response.body().database, 'up')
  })

  test('reports degraded when the database is unreachable', async ({ client, assert }) => {
    /**
     * The connection is repointed to a closed port to simulate an
     * unreachable database, and restored right after the request.
     */
    const original = db.config.connections.pg as PostgreConfig
    db.manager.patch('pg', {
      ...original,
      connection: { ...(original.connection as object), port: 1 },
    })

    const response = await client.get('/api/v1/health')

    response.assertStatus(503)
    assert.equal(response.body().status, 'degraded')
    assert.equal(response.body().database, 'down')

    db.manager.patch('pg', original)
  })
})
