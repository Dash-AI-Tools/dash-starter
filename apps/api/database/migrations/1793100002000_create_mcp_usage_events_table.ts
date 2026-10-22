import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'mcp_usage_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .integer('api_key_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('api_keys')
        .onDelete('SET NULL')
      table.string('tool').notNullable()
      table.string('outcome').notNullable()
      table.integer('duration_ms').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      /**
       * The usage of an organization is always read for a period, and the
       * usage of a key is read for the key.
       */
      table.index(['organization_id', 'created_at'])
      table.index(['api_key_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
