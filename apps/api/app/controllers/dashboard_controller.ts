import type { HttpContext } from '@adonisjs/core/http'
import { dashboardState } from '#services/dashboard'

export default class DashboardController {
  /**
   * The metrics of the organization for the dashboard home: the members,
   * the usage against the limits of the plan, the AI credits of the last
   * days and the recent activity.
   *
   * Every member reads it, so no ability is required beyond the membership
   * the organization middleware already checked.
   */
  async show({ organization, serialize }: HttpContext) {
    return serialize.withoutWrapping({
      dashboard: await dashboardState(organization),
    })
  }
}
