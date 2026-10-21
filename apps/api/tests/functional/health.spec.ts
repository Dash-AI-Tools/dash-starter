import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'

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
     * The probe of the endpoint is the unit under test, so only that query
     * is broken: a full outage takes the session middleware down first,
     * because the sessions live in the database.
     */
    const original = db.rawQuery.bind(db)
    db.rawQuery = (() => {
      throw new Error('Database is down')
    }) as typeof db.rawQuery

    const response = await client.get('/api/v1/health')

    db.rawQuery = original

    response.assertStatus(503)
    assert.equal(response.body().status, 'degraded')
    assert.equal(response.body().database, 'down')
  })
})
