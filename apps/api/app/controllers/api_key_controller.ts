import { E_MCP_NOT_ENABLED } from '#exceptions/errors'
import { createApiKey, listApiKeys, revokeApiKey } from '#services/api_keys'
import { EntitlementService } from '#services/entitlements'
import { mcpUsage } from '#services/mcp_usage'
import ApiKeyTransformer from '#transformers/api_key_transformer'
import { createApiKeyValidator } from '#validators/api_key'
import type { HttpContext } from '@adonisjs/core/http'

export default class ApiKeyController {
  /**
   * The API keys of the organization, with the calls each one of them made
   * in the current period.
   *
   * Only the admins and the owner of the organization manage the keys: they
   * are the credentials of the organization.
   */
  async index(ctx: HttpContext) {
    const { organization, membership, bouncer, serialize } = ctx

    await bouncer.authorize('manageApiKeys', membership)

    const plan = await EntitlementService.for(organization)
    const [keys, usage] = await Promise.all([listApiKeys(organization), mcpUsage(organization)])

    return serialize.withoutWrapping({
      apiKeys: keys.map((key) => ({
        ...new ApiKeyTransformer(key).toObject(),
        calls: usage.byKey.get(key.id) ?? 0,
      })),
      usage: {
        total: usage.total,
        limit: plan.entitlements.mcpCalls,
      },
      mcpEnabled: plan.entitlements.mcpEnabled,
    })
  }

  /**
   * Creates a key and answers with its secret, which is shown to the admin
   * only once: the database only keeps its hash.
   */
  async store(ctx: HttpContext) {
    const { request, auth, organization, membership, bouncer, serialize } = ctx

    await bouncer.authorize('manageApiKeys', membership)

    /**
     * The MCP server is a feature of the paid plans, so a key is only
     * created when the plan of the organization includes it.
     */
    const plan = await EntitlementService.for(organization)

    if (!plan.entitlements.mcpEnabled) {
      throw new E_MCP_NOT_ENABLED()
    }

    const { name, scopes, expiresAt } = await request.validateUsing(createApiKeyValidator)

    const { key, secret } = await createApiKey(organization, auth.getUserOrFail(), {
      name,
      scopes,
      expiresAt,
    })

    return serialize.withoutWrapping({
      apiKey: { ...new ApiKeyTransformer(key).toObject(), calls: 0 },
      secret,
    })
  }

  /**
   * Revokes a key: the clients that hold it stop working right away, and the
   * history of its calls is kept.
   */
  async destroy(ctx: HttpContext) {
    const { organization, membership, bouncer } = ctx

    await bouncer.authorize('manageApiKeys', membership)

    await revokeApiKey(organization, Number(ctx.params.id))

    return { success: true }
  }
}
