import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/api'

/**
 * The role a member holds in an organization.
 */
export type OrganizationRole = 'owner' | 'admin' | 'member'

/** An organization, as the API returns it. */
export type Organization = Awaited<
  ReturnType<typeof client.api.organization.show>
>['organization']

/** A member of an organization. */
export type Member = Awaited<
  ReturnType<typeof client.api.member.index>
>['members'][number]

/** A pending invitation of an organization. */
export type Invitation = Awaited<
  ReturnType<typeof client.api.invitation.index>
>['invitations'][number]

/**
 * The roles that can manage the members and the settings of an organization.
 */
const MANAGERS: OrganizationRole[] = ['owner', 'admin']

/**
 * Whether a role can manage the members and the settings of an organization.
 */
export function canManage(role?: OrganizationRole | null): boolean {
  return !!role && MANAGERS.includes(role)
}

/**
 * Reads the organization of the URL, with the role the visitor holds in it.
 */
export function useOrganization(orgSlug: string) {
  return useQuery({
    queryKey: ['organization', orgSlug],
    queryFn: async () => {
      const response = await client.api.organization.show({ params: { orgSlug } })
      return response.organization
    },
  })
}

/**
 * Reads the members of an organization. Every member can see the list.
 */
export function useMembers(orgSlug: string) {
  return useQuery({
    queryKey: ['members', orgSlug],
    queryFn: async () => {
      const response = await client.api.member.index({ params: { orgSlug } })
      return response.members
    },
  })
}

/**
 * Reads the pending invitations of an organization. Only the admins and the
 * owner are allowed to see them, so the query stays off for the rest.
 */
export function useInvitations(orgSlug: string, enabled = true) {
  return useQuery({
    queryKey: ['invitations', orgSlug],
    enabled,
    queryFn: async () => {
      const response = await client.api.invitation.index({ params: { orgSlug } })
      return response.invitations
    },
  })
}
