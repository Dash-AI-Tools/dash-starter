import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    /**
     * `citext` makes the email comparison case-insensitive, so the unique
     * index also rejects addresses that only differ in case. The extension
     * has to exist before the table that uses the type is created.
     */
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS citext')

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('full_name').notNullable()
      table.specificType('email', 'citext').notNullable().unique()
      table.string('password').notNullable()
      table.timestamp('email_verified_at').nullable()
      table.string('locale', 8).notNullable().defaultTo('en')
      table.string('theme', 16).notNullable().defaultTo('system')
      table.string('avatar_path').nullable()
      table.string('terms_version', 32).notNullable()
      table.timestamp('terms_accepted_at').nullable()
      table.integer('last_organization_id').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
