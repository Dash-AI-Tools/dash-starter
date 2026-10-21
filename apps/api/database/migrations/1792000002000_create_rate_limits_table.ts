import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rate_limits'

  async up() {
    /**
     * The layout matches the one expected by the `rate-limiter-flexible`
     * Postgres store: the columns are read and written by position, so
     * their order must not change.
     */
    this.schema.createTable(this.tableName, (table) => {
      table.string('key', 255).primary()
      table.integer('points').notNullable().defaultTo(0)
      table.bigInteger('expire').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
