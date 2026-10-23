import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Form } from '@/components/patterns/form'
import { PageHeader } from '@/components/patterns/page-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { client } from '@/lib/api'
import { toApiFailure } from '@/lib/api-error'
import { useI18n } from '@/lib/i18n'
import { useMembers, useOrganization } from '@/lib/organizations'
import { useCurrentUser } from '@/lib/session'

/**
 * The values of the settings form.
 */
type SettingsValues = {
  name: string
  slug: string
  logoPath: string
  defaultLocale: 'en' | 'es'
}

/**
 * The language of the organization, bound to the form.
 */
function LocaleField({ label }: { label: string }) {
  const { t } = useI18n()
  const { control } = useFormContext<SettingsValues>()

  return (
    <Controller
      control={control}
      name="defaultLocale"
      render={({ field }) => (
        <select
          id="defaultLocale"
          aria-label={label}
          value={field.value}
          onChange={(event) => field.onChange(event.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
        >
          <option value="en">{t('english')}</option>
          <option value="es">{t('spanish')}</option>
        </select>
      )}
    />
  )
}

export default function OrganizationSettingsPage() {
  const { orgSlug = '' } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState(false)
  const [confirmation, setConfirmation] = useState('')

  const { data: organization, isPending, isError } = useOrganization(orgSlug)
  const { data: members = [] } = useMembers(orgSlug)
  const { data: user } = useCurrentUser()

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('required')),
        slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, t('slugHint')),
        logoPath: z.string(),
        defaultLocale: z.enum(['en', 'es']),
      }),
    [t]
  )

  if (isPending) {
    return <p className="p-6 text-sm text-muted-foreground">{t('loading')}</p>
  }

  if (isError || !organization) {
    return <p className="p-6 text-sm text-destructive">{t('notYourOrg')}</p>
  }

  const isOwner = organization.role === 'owner'

  /**
   * The members the ownership can be handed over to. The caller is left out:
   * the API refuses a transfer to oneself.
   */
  const candidates = members.filter((member) => member.userId !== user?.id)

  return (
    <div className="space-y-8 p-6">
      <PageHeader title={t('settingsTitle')} />

      <Form<SettingsValues>
        schema={schema}
        defaultValues={{
          name: organization.name,
          slug: organization.slug,
          logoPath: organization.logoPath ?? '',
          defaultLocale: (organization.defaultLocale as 'en' | 'es') ?? 'en',
        }}
        fields={[
          { name: 'name', label: t('name') },
          { name: 'slug', label: t('slug'), description: t('slugHint') },
          { name: 'logoPath', label: t('logo') },
          {
            name: 'defaultLocale',
            label: t('defaultLocale'),
            description: t('defaultLocaleHint'),
            children: <LocaleField label={t('defaultLocale')} />,
          },
        ]}
        submitLabel={t('saveChanges')}
        onSubmit={async (values) => {
          await client.api.organization.update({
            params: { orgSlug },
            body: {
              name: values.name,
              slug: values.slug,
              logoPath: values.logoPath || null,
              defaultLocale: values.defaultLocale,
            },
          })

          toast.success(t('updated'))
          await queryClient.invalidateQueries({ queryKey: ['organization', orgSlug] })
        }}
      />

      {isOwner ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">{t('transferOwnership')}</h2>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t('selectMember')}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              defaultValue=""
              onChange={async (event) => {
                const userId = Number(event.target.value)
                if (!userId) return

                const target = candidates.find((member) => member.userId === userId)
                if (!target) return

                try {
                  await client.api.organization.transfer({
                    params: { orgSlug },
                    body: { userId },
                  })
                  toast.success(t('transferred'))
                  await queryClient.invalidateQueries({ queryKey: ['organization', orgSlug] })
                  await queryClient.invalidateQueries({ queryKey: ['members', orgSlug] })
                } catch (error) {
                  toast.error(toApiFailure(error).error.message || t('noPermission'))
                }
              }}
            >
              <option value="">{t('selectMember')}</option>
              {candidates.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.user?.fullName ?? member.user?.email}
                </option>
              ))}
            </select>
          </div>
        </section>
      ) : null}

      {isOwner ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-destructive">{t('deleteOrganization')}</h2>
          <p className="text-sm text-muted-foreground">{t('deleteWarning')}</p>

          <Button type="button" variant="destructive" onClick={() => setDeleting(true)}>
            {t('deleteOrganization')}
          </Button>
        </section>
      ) : null}

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteOrganization')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirmHint', { name: organization.name })}
            </DialogDescription>
          </DialogHeader>

          <label className="space-y-1 text-sm" htmlFor="deleteConfirmation">
            <span>{t('deleteConfirmLabel')}</span>
            <Input
              id="deleteConfirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmation !== organization.name}
              onClick={async () => {
                try {
                  await client.api.organization.destroy({
                    params: { orgSlug },
                    body: { name: confirmation },
                  })
                } catch (error) {
                  toast.error(toApiFailure(error).error.message || t('noPermission'))
                  return
                }

                toast.success(t('deleted'))
                navigate('/app', { replace: true })
              }}
            >
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
