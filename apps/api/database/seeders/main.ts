import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { seedPlans } from '#services/plans'

export default class extends BaseSeeder {
  async run() {
    await seedPlans()
  }
}
