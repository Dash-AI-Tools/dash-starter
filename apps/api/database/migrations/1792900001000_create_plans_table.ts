import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('key').notNullable().unique()
      table.jsonb('name').notNullable()
      table.jsonb('description').notNullable()
      table.jsonb('features').notNullable().defaultTo('{}')
      table.jsonb('entitlements').notNullable().defaultTo('{}')
      table.boolean('is_public').notNullable().defaultTo(true)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.boolean('is_default_free').notNullable().defaultTo(false)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    /**
     * Only one plan can be the free one. The index is partial, so the plans
     * that are not free are not affected by it.
     */
    this.schema.raw(
      'create unique index plans_single_default_free on plans (is_default_free) where is_default_free = true'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
