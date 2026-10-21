import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { dbAssertions } from '@adonisjs/lucid/plugins/db'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import limiter from '@adonisjs/limiter/services/main'
import type { Registry } from '../.adonisjs/client/registry/schema.d.ts'

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */
declare module '@japa/api-client/types' {
  interface RoutesRegistry extends Registry {}
}

/**
 * This file is imported by the "bin/test.ts" entrypoint file
 */

/**
 * Configure Japa plugins in the plugins array.
 * Learn more - https://japa.dev/docs/runner-config#plugins-optional
 */
export const plugins: Config['plugins'] = [
  assert(),
  pluginAdonisJS(app),
  dbAssertions(app),
  apiClient(),
]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [],
}

/**
 * Empties the tables of the app, so every test starts from a clean slate.
 * The tables of the schema snapshot are left alone, they belong to Lucid.
 *
 * The rate limits are left alone too: the limiter store truncates that table
 * on its own connection, so locking it here would block the store until the
 * transaction of the suite is rolled back.
 */
async function truncateTables() {
  const { rows } = await db.rawQuery(
    "select tablename from pg_tables where schemaname = 'public' and tablename not like 'adonis_schema%' and tablename != 'migrations' and tablename != 'rate_limits'"
  )

  if (!rows.length) {
    return
  }

  const tables = rows.map((row: { tablename: string }) => `"${row.tablename}"`).join(', ')
  await db.rawQuery(`truncate table ${tables} restart identity cascade`)
}

/**
 * Configure suites by tapping into the test suite instance.
 * Learn more - https://japa.dev/docs/test-suites#lifecycle-hooks
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    suite.setup(() => testUtils.httpServer().start())

    /**
     * The whole suite runs inside a transaction that is rolled back at the
     * end, so the database is left as it was found. The requests of the
     * tests use the same transaction, because the global transaction
     * replaces the connection of the database service.
     */
    suite.setup(async () => {
      await db.beginGlobalTransaction()
    })
    suite.teardown(async () => {
      await db.rollbackGlobalTransaction()
    })
  }

  /**
   * Every test starts with an empty database and with the rate limiters
   * counting from zero: without it a test would inherit the state of the
   * previous one. The hooks are registered on the groups, because the
   * `onTest` hook of the suite only reaches the tests that live outside of
   * a group.
   */
  suite.onGroup((group) =>
    group.each.setup(async () => {
      await limiter.clear()
      await truncateTables()
    })
  )
}
