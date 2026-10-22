import type { SupportedLocale } from '#app/locales'
import type Organization from '#models/organization'
import type User from '#models/user'
import { EntitlementService } from '#services/entitlements'
import { mcpUsage, recordMcpCall } from '#services/mcp_usage'
import { toolRegistry } from '#tools/main'
import type { ToolContext, ToolDefinition } from '#tools/registry'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import i18nManager from '@adonisjs/i18n/services/main'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

/**
 * The name and the version the server advertises to the clients.
 */
export const MCP_SERVER_NAME = 'dash'
export const MCP_SERVER_VERSION = '1.0.0'

/**
 * The context of a call to the MCP server: the organization the key belongs
 * to, the scopes the key holds and the member that created it.
 */
export type McpContext = {
  /** The organization the key acts on. */
  organization: Organization
  /** The identifier of the key that made the call. */
  keyId: number
  /** The scopes of the key. */
  scopes: string[]
  /** The member that created the key, when it still exists. */
  user: User | null
  /** The language the answers are written in. */
  locale: SupportedLocale
}

/**
 * The MCP server of a request.
 *
 * The tools are the ones of the registry of the product, so the chat and the
 * MCP server behave the same and the permission of a tool is enforced in one
 * place. Every tool is advertised, including the ones the key cannot use: the
 * client learns that the tool exists and that it is not allowed to use it.
 */
export function createMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    { capabilities: { tools: {} } }
  )

  for (const definition of toolRegistry.all()) {
    server.registerTool(
      definition.name,
      {
        description: translate(ctx.locale, definition.descriptionKey),
        inputSchema: definition.schema,
      },
      async (input) => await callTool(definition, input, ctx)
    )
  }

  return server
}

/**
 * Runs a tool behind the MCP server.
 *
 * The allowance of the organization is checked before the tool runs, and the
 * call is recorded after it, no matter how it ended.
 */
async function callTool(definition: ToolDefinition, input: unknown, ctx: McpContext) {
  const startedAt = Date.now()
  const { result, outcome } = await runTool(definition, input, ctx)

  await recordMcpCall({
    organization: ctx.organization,
    apiKeyId: ctx.keyId,
    tool: definition.name,
    outcome,
    durationMs: Date.now() - startedAt,
  })

  return result
}

/**
 * The answer of a tool, with the outcome it is recorded with.
 */
type ToolAnswer = {
  result: CallToolResult
  outcome: 'ok' | 'denied' | 'error' | 'quota_exceeded'
}

/**
 * Runs a tool of the registry with the permissions of the key.
 */
async function runTool(
  definition: ToolDefinition,
  input: unknown,
  ctx: McpContext
): Promise<ToolAnswer> {
  const plan = await EntitlementService.for(ctx.organization)
  const usage = await mcpUsage(ctx.organization)

  if (!EntitlementService.allows(plan.entitlements.mcpCalls, usage.total + 1)) {
    return {
      outcome: 'quota_exceeded',
      result: failure(
        'mcp_quota_exceeded',
        'The organization has used all the MCP calls of its plan.'
      ),
    }
  }

  const toolContext: ToolContext = {
    organization: ctx.organization,
    user: ctx.user,
    locale: ctx.locale,
    scopes: ctx.scopes,
  }

  try {
    const outcome = await toolRegistry.call(definition.name, input, toolContext)

    if (outcome.status === 'denied') {
      return { outcome: 'denied', result: failure(outcome.code, outcome.message) }
    }

    return {
      outcome: 'ok',
      result: { content: [{ type: 'text', text: JSON.stringify(outcome.data) }] },
    }
  } catch (error) {
    return { outcome: 'error', result: failure(codeOf(error), messageOf(error)) }
  }
}

/**
 * An answer the client reads as a failure of the tool. The code travels with
 * it, so the agent can tell a refusal from a failure.
 */
function failure(code: string, message: string): CallToolResult {
  return {
    content: [{ type: 'text', text: `${code}: ${message}` }],
    isError: true,
    _meta: { code },
  }
}

/**
 * The code of an error, when it has one.
 */
function codeOf(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code
  }

  return 'E_TOOL_FAILED'
}

/**
 * The message of an error, for the agent that reads it.
 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Reads a message of the catalog of the locale.
 */
function translate(locale: SupportedLocale, key: string): string {
  return i18nManager.locale(locale).t(key)
}
