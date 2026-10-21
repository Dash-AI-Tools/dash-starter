import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { SessionCollection } from '@adonisjs/session'

/**
 * Associates the current session with the user, so the other sessions of the
 * same user can be found later (for example to invalidate them after a
 * password reset).
 *
 * The tag has to be applied after the login, because logging in regenerates
 * the session id.
 */
export async function tagSession(ctx: HttpContext, userId: number): Promise<void> {
  await ctx.session.tag(String(userId))
}

/**
 * Destroys the sessions of a user. The session of the current request is
 * kept, so completing a password reset does not sign the visitor out.
 */
export async function invalidateUserSessions(ctx: HttpContext, userId: number): Promise<void> {
  const collection = await app.container.make(SessionCollection)
  const sessions = await collection.tagged(String(userId))

  await Promise.all(
    sessions
      .filter((session) => session.id !== ctx.session.sessionId)
      .map((session) => collection.destroy(session.id))
  )
}
