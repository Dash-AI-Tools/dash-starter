import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Form } from '@/components/patterns/form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { client } from '@/lib/api'
import { toApiFailure } from '@/lib/api-error'
import { useI18n } from '@/lib/i18n'

/**
 * The roles an invitation can grant. The ownership is not offered: it is
 * handed over explicitly, never as a side effect of an invitation.
 */
const INVITABLE_ROLES = ['admin', 'member'] as const

type InviteValues = {
  email: string
  role: (typeof INVITABLE_ROLES)[number]
}

/**
 * The role of the invitation, bound to the form.
 */
function RoleField({ label }: { label: string }) {
  const { t } = useI18n()
  const { control } = useFormContext<InviteValues>()

  return (
    <Controller
      control={control}
      name="role"
      render={({ field }) => (
        <select
          id="role"
          aria-label={label}
          value={field.value}
          onChange={(event) => field.onChange(event.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          {INVITABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {role === 'admin' ? t('roleAdmin') : t('roleMember')}
            </option>
          ))}
        </select>
      )}
    />
  )
}

/**
 * The dialog that invites somebody to the organization. Only the admins and
 * the owner of the organization can invite.
 */
export function InviteDialog({ orgSlug }: { orgSlug: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('invalidEmail')),
        role: z.enum(INVITABLE_ROLES),
      }),
    [t]
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>{t('inviteTitle')}</Button>} />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('inviteTitle')}</DialogTitle>
          <DialogDescription>{t('inviteDescription')}</DialogDescription>
        </DialogHeader>

        <Form<InviteValues>
          schema={schema}
          defaultValues={{ role: 'member' }}
          fields={[
            {
              name: 'email',
              label: t('inviteEmail'),
              type: 'email',
              placeholder: t('inviteEmailPlaceholder'),
            },
            {
              name: 'role',
              label: t('inviteRole'),
              children: <RoleField label={t('inviteRole')} />,
            },
          ]}
          submitLabel={t('inviteSend')}
          onSubmit={async (values) => {
            try {
              await client.api.invitation.store({
                params: { orgSlug },
                body: values,
              })
            } catch (error) {
              const failure = toApiFailure(error)

              /**
               * A plan without seats left is not a field error, but the user
               * has to know that an upgrade is the way out.
               */
              if (failure.kind === 'payment_required') {
                toast.error(t('seatLimitReached'))
                return
              }

              throw error
            }

            toast.success(t('inviteSent'))
            await queryClient.invalidateQueries({ queryKey: ['invitations', orgSlug] })
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
