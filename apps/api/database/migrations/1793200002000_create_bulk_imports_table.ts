import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bulk_imports'

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
      table.string('file_name', 255).notNullable()
      table.string('state', 16).notNullable().defaultTo('pending')
      table.integer('total_rows').notNullable().defaultTo(0)
      table.integer('imported_rows').notNullable().defaultTo(0)
      table.jsonb('errors').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['organization_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
