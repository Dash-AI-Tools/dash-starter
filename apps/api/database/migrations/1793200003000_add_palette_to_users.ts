import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      /**
       * No value means the user never picked a palette, so the configured
       * default of the web app applies.
       */
      table.string('palette', 16).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('palette')
    })
  }
}
