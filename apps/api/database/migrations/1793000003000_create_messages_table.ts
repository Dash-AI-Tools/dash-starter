import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('conversation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('conversations')
        .onDelete('CASCADE')
      table.string('role').notNullable()
      /**
       * The parts of the message, in the format the AI SDK uses for the
       * messages of the interface.
       */
      table.jsonb('parts').notNullable().defaultTo('[]')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      /**
       * The messages of a conversation are always read in order.
       */
      table.index(['conversation_id', 'id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
