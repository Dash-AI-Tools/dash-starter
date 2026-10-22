import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Form } from '@/components/patterns/form'
import { PageHeader } from '@/components/patterns/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { client, uploadAvatar } from '@/lib/api'
import { toApiFailure } from '@/lib/api-error'
import { LOCALES, useI18n, type Locale } from '@/lib/i18n'
import { useCurrentUser, useSetCurrentUser } from '@/lib/session'
import { THEMES, useTheme, type Theme } from '@/providers/theme-provider'

/**
 * The images the avatar accepts.
 */
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/**
 * The biggest avatar that is accepted, in bytes.
 */
const AVATAR_MAX_BYTES = 2 * 1024 * 1024

/**
 * The profile of the visitor: their identity, their credentials, their
 * preferences and the end of their account.
 */
export default function ProfilePage() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const setCurrentUser = useSetCurrentUser()

  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const nameSchema = useMemo(() => z.object({ fullName: z.string().min(1, t('required')) }), [t])

  const emailSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('invalidEmail')),
        currentPassword: z.string().min(1, t('required')),
      }),
    [t]
  )

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t('required')),
          password: z.string().min(8, t('passwordTooShort')),
          passwordConfirmation: z.string().min(1, t('required')),
        })
        .refine((values) => values.password === values.passwordConfirmation, {
          message: t('passwordsDontMatch'),
          path: ['passwordConfirmation'],
        }),
    [t]
  )

  const deleteSchema = useMemo(() => z.object({ password: z.string().min(1, t('required')) }), [t])

  /**
   * Uploads the picture the visitor picked. The type and the size are checked
   * before the file travels, so an oversized picture is rejected right away.
   */
  async function onAvatarSelected(file: File) {
    if (!AVATAR_TYPES.includes(file.type) || file.size > AVATAR_MAX_BYTES) {
      setAvatarError(t('avatarInvalid'))
      return
    }

    setAvatarError(null)
    setUploading(true)

    try {
      const response = await uploadAvatar(file)
      setCurrentUser(response.user)
      toast.success(t('uploaded'))
    } catch (error) {
      setAvatarError(toApiFailure(error).error.message || t('avatarInvalid'))
    } finally {
      setUploading(false)
    }
  }

  /**
   * Applies a preference right away and remembers it on the server, so the
   * next device uses it too.
   */
  async function savePreference(patch: { locale?: Locale; theme?: Theme }) {
    try {
      const response = await client.api.profile.update({ body: patch })
      setCurrentUser(response.user)
    } catch (error) {
      toast.error(toApiFailure(error).error.message || t('unknownError'))
    }
  }

  /**
   * The page is built around the visitor, so it waits for the session before
   * showing anything. The name of the form comes from the session too.
   */
  if (!user) return null

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('profileTitle')} description={t('profileSubtitle')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('fullName')}</CardTitle>
          <CardDescription>{t('avatarHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              {user?.avatarPath ? <AvatarImage src={user.avatarPath} alt="" /> : null}
              <AvatarFallback>{user?.initials ?? '?'}</AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <Label htmlFor="avatar" className="text-sm font-medium">
                {t('avatar')}
              </Label>
              <Input
                id="avatar"
                type="file"
                accept={AVATAR_TYPES.join(',')}
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) onAvatarSelected(file)
                }}
              />
              {avatarError ? (
                <p role="alert" className="text-sm text-destructive">
                  {avatarError}
                </p>
              ) : null}
            </div>
          </div>

          <Form
            schema={nameSchema}
            fields={[{ name: 'fullName', label: t('fullName') }]}
            submitLabel={t('save')}
            defaultValues={{ fullName: user?.fullName ?? '' }}
            onSubmit={async (values) => {
              const response = await client.api.profile.update({ body: values })
              setCurrentUser(response.user)
              toast.success(t('profileSaved'))
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('emailChange')}</CardTitle>
          <CardDescription>
            {user?.pendingEmail ? t('emailPending', { email: user.pendingEmail }) : user?.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form
            schema={emailSchema}
            fields={[
              { name: 'email', label: t('emailNew'), type: 'email' },
              { name: 'currentPassword', label: t('emailCurrentPassword'), type: 'password' },
            ]}
            submitLabel={t('emailChange')}
            onSubmit={async (values) => {
              await client.api.profile.email({ body: values })
              toast.success(t('emailSent'))
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('changePassword')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            schema={passwordSchema}
            fields={[
              { name: 'currentPassword', label: t('currentPassword'), type: 'password' },
              {
                name: 'password',
                label: t('newPassword'),
                type: 'password',
                description: t('passwordHint'),
              },
              { name: 'passwordConfirmation', label: t('confirmNewPassword'), type: 'password' },
            ]}
            submitLabel={t('changePassword')}
            onSubmit={async (values) => {
              await client.api.profile.password({ body: values })
              toast.success(t('passwordChanged'))
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('preferences')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="locale" className="text-sm font-medium">
              {t('language')}
            </Label>
            <select
              id="locale"
              value={locale}
              onChange={async (event) => {
                const next = event.target.value as Locale
                setLocale(next)
                await savePreference({ locale: next })
              }}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {LOCALES.map((option) => (
                <option key={option} value={option}>
                  {option === 'en' ? t('english') : t('spanish')}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="theme" className="text-sm font-medium">
              {t('theme')}
            </Label>
            <select
              id="theme"
              value={theme}
              onChange={async (event) => {
                const next = event.target.value as Theme
                setTheme(next)
                await savePreference({ theme: next })
              }}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {THEMES.map((option) => (
                <option key={option} value={option}>
                  {option === 'light'
                    ? t('themeLight')
                    : option === 'dark'
                      ? t('themeDark')
                      : t('themeSystem')}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('account')}</CardTitle>
          <CardDescription>{t('accountDeleteWarning')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="destructive" onClick={() => setDeleting(true)}>
            {t('deleteAccount')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleting} onOpenChange={(open) => !open && setDeleting(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteAccount')}</DialogTitle>
            <DialogDescription>{t('accountDeleteWarning')}</DialogDescription>
          </DialogHeader>

          <Form
            schema={deleteSchema}
            fields={[{ name: 'password', label: t('accountDeleteConfirmLabel'), type: 'password' }]}
            submitLabel={t('deleteAccount')}
            onSubmit={async (values) => {
              await client.api.profile.destroy({ body: values })
              setCurrentUser(null)
              toast.success(t('accountDeleted'))
              navigate('/', { replace: true })
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
