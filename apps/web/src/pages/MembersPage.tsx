import { useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { InviteDialog } from '@/components/organizations/invite-dialog'
import { DataTable } from '@/components/patterns/data-table'
import { PageHeader } from '@/components/patterns/page-header'
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@dash/ui'
import { client } from '@/lib/api'
import { toApiFailure } from '@/lib/api-error'
import { useI18n } from '@/lib/i18n'
import { canManage, useInvitations, useMembers, useOrganization } from '@/lib/organizations'
import { useCurrentUser } from '@/lib/session'

/**
 * The action the confirmation dialog is about to run.
 */
type PendingAction = { kind: 'remove'; userId: number; name: string } | { kind: 'leave' }

export default function MembersPage() {
  const { orgSlug = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [pending, setPending] = useState<PendingAction | null>(null)

  const { data: organization } = useOrganization(orgSlug)
  const { data: members = [] } = useMembers(orgSlug)
  const { data: user } = useCurrentUser()

  /**
   * The admins and the owner manage the members; the rest only look at them.
   */
  const manages = canManage(organization?.role)
  const { data: invitations = [] } = useInvitations(orgSlug, manages)

  const isOwner = organization?.role === 'owner'

  /**
   * The label of a role, in the language of the page.
   */
  const roleLabel = useCallback(
    (role: string) =>
      role === 'owner' ? t('roleOwner') : role === 'admin' ? t('roleAdmin') : t('roleMember'),
    [t]
  )

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['members', orgSlug] })
  }, [queryClient, orgSlug])

  const columns = useMemo<ColumnDef<(typeof members)[number], unknown>[]>(
    () => [
      {
        id: 'member',
        header: t('member'),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const member = row.original
          const name = member.user?.fullName ?? member.user?.email ?? ''

          return (
            <div className="flex items-center gap-2">
              <Avatar size="sm">
                <AvatarFallback>{member.user?.initials ?? '?'}</AvatarFallback>
              </Avatar>
              <div className="leading-tight">
                <div>{name}</div>
                <div className="text-xs text-muted-foreground">
                  {member.user?.email}
                  {member.userId === user?.id ? ` · ${t('thisIsYou')}` : ''}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        id: 'role',
        header: t('role'),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => <Badge variant="secondary">{roleLabel(row.original.role)}</Badge>,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const member = row.original
          const name = member.user?.fullName ?? member.user?.email ?? ''

          /**
           * An admin cannot touch the owner of the organization.
           */
          if (!manages || (member.role === 'owner' && !isOwner)) {
            return null
          }

          return (
            <div className="flex items-center gap-2">
              {member.role !== 'owner' ? (
                <select
                  aria-label={t('changeRoleOf', { name })}
                  value={member.role}
                  onChange={async (event) => {
                    const role = event.target.value as 'admin' | 'member'
                    try {
                      await client.api.member.update({
                        params: { orgSlug, userId: String(member.userId) },
                        body: { role },
                      })
                      toast.success(t('roleUpdated'))
                      await refresh()
                    } catch (error) {
                      toast.error(toApiFailure(error).error.message || t('noPermission'))
                    }
                  }}
                  className="h-7 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="admin">{t('roleAdmin')}</option>
                  <option value="member">{t('roleMember')}</option>
                </select>
              ) : null}

              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => setPending({ kind: 'remove', userId: member.userId, name })}
              >
                {t('removeMember')}
              </Button>
            </div>
          )
        },
      },
    ],
    [t, manages, isOwner, orgSlug, user?.id, refresh, roleLabel]
  )

  /**
   * The rows of the table, filtered by the search of the URL.
   */
  const search = (searchParams.get('search') ?? '').toLowerCase()
  const filtered = members.filter((member) => {
    if (!search) return true
    return (
      member.user?.fullName?.toLowerCase().includes(search) ||
      member.user?.email?.toLowerCase().includes(search)
    )
  })

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('membersTitle')}
        actions={
          manages ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" render={<Link to={`/app/${orgSlug}/members/import`} />}>
                {t('importMembers')}
              </Button>
              <InviteDialog orgSlug={orgSlug} />
            </div>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        total={filtered.length}
        getRowId={(member) => String(member.userId)}
        emptyState={t('membersEmpty')}
        searchPlaceholder={t('search')}
        labels={{ search: t('search'), previous: t('previous'), next: t('next') }}
      />

      {manages ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">{t('invitationsTitle')}</h2>

          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('invitationsEmpty')}</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('inviteEmail')}</TableHead>
                    <TableHead>{t('role')}</TableHead>
                    <TableHead>{t('invitedBy')}</TableHead>
                    <TableHead>{t('inviteExpires')}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>{roleLabel(invitation.role)}</TableCell>
                      <TableCell>{invitation.invitedBy?.fullName}</TableCell>
                      <TableCell>
                        {invitation.expiresAt
                          ? new Date(invitation.expiresAt).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await client.api.invitation.destroy({
                                params: { orgSlug, id: String(invitation.id) },
                              })
                              toast.success(t('revoked'))
                              await queryClient.invalidateQueries({
                                queryKey: ['invitations', orgSlug],
                              })
                            } catch (error) {
                              toast.error(toApiFailure(error).error.message || t('noPermission'))
                            }
                          }}
                        >
                          {t('revoke')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : null}

      <div>
        <Button type="button" variant="outline" onClick={() => setPending({ kind: 'leave' })}>
          {t('leaveOrganization')}
        </Button>
      </div>

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.kind === 'leave' ? t('leaveOrganization') : t('removeMember')}
            </DialogTitle>
            <DialogDescription>
              {pending?.kind === 'leave'
                ? t('leaveConfirm')
                : t('removeMemberConfirm', { name: pending?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPending(null)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                const action = pending
                setPending(null)

                try {
                  if (action?.kind === 'leave') {
                    await client.api.member.leave({ params: { orgSlug } })
                    toast.success(t('left'))
                    navigate('/app', { replace: true })
                    return
                  }

                  if (action) {
                    await client.api.member.destroy({
                      params: { orgSlug, userId: String(action.userId) },
                    })
                    toast.success(t('memberRemoved'))
                    await refresh()
                  }
                } catch (error) {
                  const failure = toApiFailure(error)
                  toast.error(
                    failure.error.code === 'E_LAST_OWNER'
                      ? t('lastOwner')
                      : failure.error.message || t('noPermission')
                  )
                }
              }}
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
