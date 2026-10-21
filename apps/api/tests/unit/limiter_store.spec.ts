import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import limiter from '@adonisjs/limiter/services/main'

/**
 * The rate limits of the test suite live in memory, but production stores them
 * in the database. This test exercises the database store, so a change in the
 * layout of the table is caught here.
 */
test.group('Rate limiter store', () => {
  test('the database store counts the requests and blocks the extra ones', async ({ assert }) => {
    const instance = limiter.use('database', { requests: 2, duration: '1 minute' })

    try {
      await instance.consume('probe:key')
      await instance.consume('probe:key')

      const error = await instance.consume('probe:key').catch((raised) => raised)
      assert.equal(error.status, 429)

      /**
       * The store prefixes the key with its own namespace.
       */
      const { rows } = await db.rawQuery('select * from rate_limits')
      assert.lengthOf(rows, 1)
      assert.equal(rows[0].key, 'rlflx:probe:key')
      assert.equal(Number(rows[0].points), 3)
    } finally {
      await db.rawQuery('delete from rate_limits')
    }
  })
})
