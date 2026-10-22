import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('organization_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('organizations')
        .onDelete('CASCADE')
      table
        .integer('plan_price_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('plan_prices')
        .onDelete('SET NULL')
      table.string('creem_subscription_id').nullable()
      table.string('creem_customer_id').nullable()
      table.string('status').notNullable().defaultTo('inactive')
      table.timestamp('current_period_end').nullable()
      table.boolean('cancel_at_period_end').notNullable().defaultTo(false)
      table.timestamp('grace_until').nullable()
      table.timestamp('last_event_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
