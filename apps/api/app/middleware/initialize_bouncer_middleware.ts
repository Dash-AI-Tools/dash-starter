import * as abilities from '#abilities/main'
import { Bouncer } from '@adonisjs/bouncer'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Puts a Bouncer instance in the context, so the controllers can ask it
 * whether the caller is allowed to do something.
 */
export default class InitializeBouncerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    ctx.bouncer = new Bouncer(() => ctx.auth.user || null, abilities).setContainerResolver(
      ctx.containerResolver
    )

    return next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    bouncer: Bouncer<Exclude<HttpContext['auth']['user'], undefined>, typeof abilities>
  }
}
