import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@dash/ui'
import { client } from '@/lib/api'
import { toApiFailure } from '@/lib/api-error'
import { useI18n } from '@/lib/i18n'
import { useCurrentUser } from '@/lib/session'

export default function AcceptInvitationPage() {
  const { token = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const [accepting, setAccepting] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)

  /**
   * The details of the invitation. The token is the secret of the invitation,
   * so the holder of the link is the person it was sent to.
   */
  const {
    data: invitation,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const response = await client.api.invitation.show({ params: { token } })
      return response.invitation
    },
  })

  const roleLabel = (role: string) =>
    role === 'owner' ? t('roleOwner') : role === 'admin' ? t('roleAdmin') : t('roleMember')

  const accept = async () => {
    setAccepting(true)
    setRefused(null)

    try {
      await client.api.invitation.accept({ params: { token } })
    } catch (error) {
      const failure = toApiFailure(error)

      if (failure.error.code === 'E_INVITATION_MISMATCH') {
        setRefused(t('inviteMismatch'))
      } else if (failure.error.code === 'E_INVITATION_INVALID') {
        setRefused(t('inviteInvalidToken'))
      } else {
        toast.error(failure.error.message || t('unknownError'))
      }

      setAccepting(false)
      return
    }

    toast.success(t('inviteAccepted', { org: invitation?.organization.name ?? '' }))
    navigate(`/app/${invitation?.organization.slug ?? ''}`, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {isPending
              ? t('loading')
              : t('acceptInviteTitle', { org: invitation?.organization.name ?? '' })}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {isError ? (
            <p role="alert" className="text-sm text-destructive">
              {t('inviteInvalidToken')}
            </p>
          ) : null}

          {refused ? (
            <p role="alert" className="text-sm text-destructive">
              {refused}
            </p>
          ) : null}

          {invitation && invitation.status === 'expired' ? (
            <p role="alert" className="text-sm text-destructive">
              {t('inviteExpired')}
            </p>
          ) : null}

          {invitation && invitation.status === 'revoked' ? (
            <p role="alert" className="text-sm text-destructive">
              {t('inviteInvalidToken')}
            </p>
          ) : null}

          {invitation && invitation.status === 'accepted' ? (
            <p className="text-sm text-muted-foreground">
              {t('inviteAccepted', { org: invitation.organization.name })}
            </p>
          ) : null}

          {invitation && invitation.status === 'pending' ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t('acceptInviteBody', {
                  org: invitation.organization.name,
                  role: roleLabel(invitation.role),
                })}
              </p>

              {user ? (
                <Button type="button" disabled={accepting} onClick={accept}>
                  {t('acceptInvite')}
                </Button>
              ) : (
                <Button
                  render={
                    <Link
                      to={`/signup?email=${encodeURIComponent(invitation.email)}&invitation=${encodeURIComponent(token)}`}
                    />
                  }
                >
                  {t('acceptInviteSignup', { org: invitation.organization.name })}
                </Button>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
