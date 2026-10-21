import { E_ORGANIZATION_NOT_FOUND } from '#exceptions/errors'
import Membership from '#models/membership'
import type Organization from '#models/organization'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Resolves the organization of the request through the membership of the
 * caller.
 *
 * The organization is never looked up by its slug alone: a user that does
 * not belong to it gets a 404, so the answer does not reveal whether the
 * organization exists.
 */
export default class OrgMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user as { id: number }

    const membership = await Membership.query()
      .where('userId', user.id)
      .whereHas('organization', (query) => query.where('slug', ctx.params.orgSlug))
      .preload('organization')
      .first()

    if (!membership) {
      throw new E_ORGANIZATION_NOT_FOUND()
    }

    ctx.organization = membership.organization
    ctx.membership = membership

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    /** The organization of the request. */
    organization: Organization
    /** The membership of the caller in the organization. */
    membership: Membership
  }
}
