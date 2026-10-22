import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'api_keys'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      /**
       * The provider of the framework writes the owner of the key in this
       * column, so the name is the one it expects.
       */
      table
        .integer('tokenable_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .integer('created_by_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('type').notNullable()
      table.string('name').nullable()
      /**
       * The part of the key the listings show, so the secret never has to be
       * stored in the clear.
       */
      table.string('prefix').nullable()
      table.string('hash').notNullable()
      /**
       * The scopes of the key, as the list the provider writes.
       */
      table.text('abilities').notNullable()
      table.timestamp('last_used_at').nullable()
      table.timestamp('expires_at').nullable()
      table.timestamp('revoked_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      /**
       * The keys of an organization are always read for it and for their
       * type, and the usage of a key is read for the key and the date.
       */
      table.index(['tokenable_id', 'type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
