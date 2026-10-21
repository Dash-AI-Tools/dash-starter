import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

/**
 * Unauthenticated readiness probe. Reports the process and the database
 * connection so Compose health checks can gate traffic on the API.
 */
export default class HealthController {
  async show({ response }: HttpContext) {
    let database: 'up' | 'down' = 'up'

    try {
      await db.rawQuery('select 1')
    } catch {
      database = 'down'
    }

    const healthy = database === 'up'

    response.status(healthy ? 200 : 503)

    return {
      status: healthy ? 'ok' : 'degraded',
      database,
      uptime: Math.floor(process.uptime()),
    }
  }
}
