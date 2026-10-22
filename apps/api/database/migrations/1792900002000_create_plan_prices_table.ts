import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'plan_prices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('plan_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('plans')
        .onDelete('CASCADE')
      table.enu('interval', ['month', 'year']).notNullable()
      table.integer('amount_cents').notNullable()
      table.string('currency', 3).notNullable().defaultTo('USD')
      table.string('creem_product_id').nullable()
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    /**
     * A plan has at most one active price per interval. A price change creates
     * a new row instead of editing the one the subscribers hold.
     */
    this.schema.raw(
      'create unique index plan_prices_single_active_per_interval on plan_prices (plan_id, interval) where is_active = true'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
