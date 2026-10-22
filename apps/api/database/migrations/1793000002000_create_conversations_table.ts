import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'conversations'

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
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      /**
       * The title is written by the model after the first exchange, so a
       * conversation that was never answered has none.
       */
      table.string('title').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      /**
       * A conversation belongs to an organization and to the member that
       * wrote it, and the list of the member is always read for both.
       */
      table.index(['organization_id', 'user_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
