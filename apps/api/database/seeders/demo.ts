import { seedDemo } from '#services/demo'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * The demo account only exists in the development environment, so the runner
 * ignores this seeder everywhere else.
 */
export default class extends BaseSeeder {
  static environment = ['development']

  async run() {
    await seedDemo()
  }
}
