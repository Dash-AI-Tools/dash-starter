import { ROLES } from '#models/membership'
import type { ToolDefinition } from '#tools/registry'
import { z } from 'zod'

/**
 * The members of the organization, with the role of each one of them.
 *
 * Every member can ask for the list: it is the directory of their own
 * organization, the same one the members page shows.
 */
export const listMembersTool: ToolDefinition = {
  name: 'list_members',
  descriptionKey: 'chat.tools.listMembers',
  schema: z.object({
    /** Only the members that hold this role. */
    role: z.enum(ROLES).optional(),
  }),
  minRole: 'member',
  scope: 'members:read',
  async execute(input, ctx) {
    const query = ctx.organization
      .related('memberships')
      .query()
      .preload('user')
      .orderBy('createdAt', 'asc')

    if (input.role) {
      query.where('role', input.role)
    }

    const memberships = await query

    return {
      members: memberships.map((membership) => ({
        name: membership.user.fullName,
        email: membership.user.email,
        role: membership.role,
        joinedAt: membership.createdAt.toISO(),
      })),
    }
  },
}
