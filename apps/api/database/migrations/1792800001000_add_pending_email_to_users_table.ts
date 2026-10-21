import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    /**
     * The address the user wants to move to. It stays pending until the link
     * sent to it is opened, so the current address keeps working.
     */
    this.schema.alterTable(this.tableName, (table) => {
      table.specificType('pending_email', 'citext').nullable()
    })

    /**
     * Two accounts cannot ask for the same address at the same time.
     */
    this.schema.raw(
      'CREATE UNIQUE INDEX users_pending_email_unique ON users (pending_email) WHERE pending_email IS NOT NULL'
    )
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS users_pending_email_unique')
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('pending_email')
    })
  }
}
