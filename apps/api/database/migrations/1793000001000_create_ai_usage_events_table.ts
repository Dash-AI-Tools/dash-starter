import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ai_usage_events'

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
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('feature').notNullable()
      table.string('alias').notNullable()
      table.string('provider').notNullable()
      table.string('model_id').notNullable()
      table.integer('input_tokens').notNullable().defaultTo(0)
      table.integer('output_tokens').notNullable().defaultTo(0)
      table.integer('images').notNullable().defaultTo(0)
      table.double('credits').notNullable().defaultTo(0)
      table.integer('latency_ms').notNullable().defaultTo(0)
      table.string('outcome').notNullable()
      table.string('error_message').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      /**
       * The usage of an organization is always read for a period, so the
       * events are looked up by organization and date.
       */
      table.index(['organization_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
