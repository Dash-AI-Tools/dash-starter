import { isSupportedLocale, type SupportedLocale } from '#app/locales'
import { E_INVALID_API_KEY, E_MCP_NOT_ENABLED } from '#exceptions/errors'
import { verifyApiKey } from '#services/api_keys'
import { EntitlementService } from '#services/entitlements'
import { createMcpServer } from '#services/mcp'
import { consumeMcpBudget } from '#services/rate_limits'
import type { HttpContext } from '@adonisjs/core/http'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'

export default class McpController {
  /**
   * The MCP server of the organization.
   *
   * The server is stateless: every request gets its own transport and its own
   * server, so the endpoint works behind a load balancer that does not keep
   * the connections of the clients.
   */
  async handle(ctx: HttpContext) {
    const auth = await this.authenticate(ctx)
    const plan = await EntitlementService.for(auth.organization)

    /**
     * The MCP server is a feature of the paid plans: a key of an
     * organization that is not on one of them does not reach it.
     */
    if (!plan.entitlements.mcpEnabled) {
      throw new E_MCP_NOT_ENABLED()
    }

    await consumeMcpBudget(auth.key.id, auth.organization.id, plan.entitlements.mcpRpm)

    const server = createMcpServer({
      organization: auth.organization,
      keyId: auth.key.id,
      scopes: auth.scopes,
      user: auth.creator,
      locale: this.localeOf(ctx),
    })

    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })

    await server.connect(transport)
    ctx.response.onFinish(() => void transport.close())

    const response = await transport.handleRequest(this.toWebRequest(ctx), {
      parsedBody: ctx.request.body(),
    })

    ctx.response.status(response.status)
    response.headers.forEach((value, key) => ctx.response.header(key, value))

    if (!response.body) {
      return
    }

    return ctx.response.stream(response.body as ReadableStream)
  }

  /**
   * The server does not offer a stream of events: every request is answered
   * on its own, so there is nothing for the client to listen to.
   */
  async stream(ctx: HttpContext) {
    ctx.response.status(405).send({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'The server does not offer a stream of events',
      },
      id: null,
    })
  }

  /**
   * The organization and the key the request comes with.
   *
   * A key that was revoked, that expired or that does not exist has no
   * organization: the answer is a 401 and no tool runs.
   */
  private async authenticate(ctx: HttpContext) {
    const secret = bearerToken(ctx.request.header('authorization'))
    const auth = secret ? await verifyApiKey(secret) : null

    if (!auth) {
      throw new E_INVALID_API_KEY()
    }

    return auth
  }

  /**
   * The request of Adonis as the request the transport understands.
   */
  private toWebRequest(ctx: HttpContext): Request {
    const headers = new Headers()

    for (const [key, value] of Object.entries(ctx.request.headers())) {
      if (typeof value === 'string') {
        headers.set(key, value)
      }
    }

    return new Request(ctx.request.completeUrl(), {
      method: ctx.request.method(),
      headers,
    })
  }

  /**
   * The language the descriptions of the tools are written in.
   */
  private localeOf(ctx: HttpContext): SupportedLocale {
    return isSupportedLocale(ctx.i18n?.locale) ? ctx.i18n.locale : 'en'
  }
}

/**
 * The secret of the `Authorization: Bearer` header of the request.
 */
function bearerToken(header?: string): string | null {
  if (!header) {
    return null
  }

  const [scheme, ...rest] = header.split(' ')
  const value = rest.join(' ').trim()

  if (scheme?.toLowerCase() !== 'bearer' || !value) {
    return null
  }

  return value
}
