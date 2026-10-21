import env from '#start/env'
import { defineConfig, stores } from '@adonisjs/limiter'

/**
 * The rate limits are stored in the database, so they survive a restart and
 * are shared by every instance of the API. The memory store is only used by
 * the test suite.
 */
export default defineConfig({
  default: env.get('LIMITER_STORE'),

  stores: {
    database: stores.database({ tableName: 'rate_limits' }),
    memory: stores.memory({}),
  },
})
