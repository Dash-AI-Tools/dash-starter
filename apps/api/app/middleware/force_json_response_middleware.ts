import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class ForceJsonResponseMiddleware {
  handle(ctx: HttpContext, next: NextFn) {
    /**
     * The MCP server speaks its own protocol: the client says the formats it
     * accepts, and the transport refuses the request when they are not the
     * ones it needs.
     */
    if (!ctx.request.url().startsWith('/mcp')) {
      ctx.request.request.headers.accept = 'application/json'
    }

    return next()
  }
}
