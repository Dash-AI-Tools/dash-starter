import McpUsageEvent from '#models/mcp_usage_event'
import type { McpUsageOutcome } from '#models/mcp_usage_event'
import type Organization from '#models/organization'
import { periodStartOf } from '#services/ai_usage'
import db from '@adonisjs/lucid/services/db'

/**
 * The calls the organization has made to the MCP server in the current
 * period, in total and per key.
 */
export async function mcpUsage(
  organization: Organization
): Promise<{ total: number; byKey: Map<number, number> }> {
  const periodStart = await periodStartOf(organization)

  const rows = await db
    .query()
    .from('mcp_usage_events')
    .where('organization_id', organization.id)
    .where('created_at', '>=', periodStart.toJSDate())
    .select('api_key_id')
    .count('* as total')
    .groupBy('api_key_id')

  const byKey = new Map<number, number>()
  let total = 0

  for (const row of rows) {
    const calls = Number(row.total)
    total += calls

    if (row.api_key_id) {
      byKey.set(row.api_key_id, calls)
    }
  }

  return { total, byKey }
}

/**
 * Records a call to the MCP server, with the tool it ran and how it ended.
 */
export async function recordMcpCall(params: {
  organization: Organization
  apiKeyId: number
  tool: string
  outcome: McpUsageOutcome
  durationMs: number
}): Promise<void> {
  await McpUsageEvent.create({
    organizationId: params.organization.id,
    apiKeyId: params.apiKeyId,
    tool: params.tool,
    outcome: params.outcome,
    durationMs: params.durationMs,
  })
}
