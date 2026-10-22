import { EntitlementService } from '#services/entitlements'
import type { ToolDefinition } from '#tools/registry'
import db from '@adonisjs/lucid/services/db'
import { z } from 'zod'

/**
 * The data of the organization the member belongs to.
 *
 * Every member can ask for it: the name of the organization and the plan it
 * has are not a secret of the administration.
 */
export const organizationInfoTool: ToolDefinition = {
  name: 'organization_info',
  descriptionKey: 'chat.tools.organizationInfo',
  schema: z.object({}),
  minRole: 'member',
  scope: 'mcp:read',
  async execute(_input, ctx) {
    const members = await db
      .query()
      .from('memberships')
      .where('organization_id', ctx.organization.id)
      .count('* as total')
      .firstOrFail()

    const plan = await EntitlementService.for(ctx.organization)

    return {
      name: ctx.organization.name,
      slug: ctx.organization.slug,
      defaultLocale: ctx.organization.defaultLocale,
      members: Number(members.total),
      plan: plan.key,
      createdAt: ctx.organization.createdAt.toISO(),
    }
  },
}
