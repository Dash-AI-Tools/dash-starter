import { E_EMAIL_NOT_VERIFIED } from '#exceptions/errors'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Blocks the routes that need a confirmed email address. The unverified
 * users are asked to confirm theirs before they can reach the paid
 * features or invite members.
 */
export default class VerifiedMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user as { isEmailVerified?: boolean } | undefined

    if (!user?.isEmailVerified) {
      throw new E_EMAIL_NOT_VERIFIED()
    }

    return next()
  }
}
