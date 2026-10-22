import { usedCredits } from '#services/ai_usage'
import { EntitlementService } from '#services/entitlements'
import type { ToolDefinition } from '#tools/registry'
import { z } from 'zod'

/**
 * How many AI credits the organization has used, and how many it has left.
 *
 * The usage of the AI is the business of the administration, so the tool is
 * denied to the members that are not admins.
 */
export const aiUsageTool: ToolDefinition = {
  name: 'ai_usage_summary',
  descriptionKey: 'chat.tools.aiUsageSummary',
  schema: z.object({}),
  minRole: 'admin',
  scope: 'billing:read',
  async execute(_input, ctx) {
    const [plan, used] = await Promise.all([
      EntitlementService.for(ctx.organization),
      usedCredits(ctx.organization),
    ])

    const limits = plan.entitlements

    return {
      plan: plan.key,
      usedCredits: used,
      limitCredits: limits.aiCredits,
      remainingCredits: limits.aiCredits < 0 ? null : Math.max(0, limits.aiCredits - used),
    }
  },
}
