import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Form } from '@/components/patterns/form'
import { client } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

export default function ResetPasswordPage() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const [done, setDone] = useState(false)

  /**
   * The single-use token travels in the link of the email.
   */
  const token = params.get('token') ?? ''

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, t('passwordTooShort')),
          passwordConfirmation: z.string().min(1, t('required')),
        })
        .refine((values) => values.password === values.passwordConfirmation, {
          message: t('passwordsDontMatch'),
          path: ['passwordConfirmation'],
        }),
    [t]
  )

  if (!token) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('resetTitle')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('resetInvalid')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('resetTitle')}</h1>

      {done ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t('resetSuccess')}</p>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="underline-offset-4 hover:underline">
              {t('signIn')}
            </Link>
          </p>
        </>
      ) : (
        <Form
          className="mt-8"
          schema={schema}
          fields={[
            {
              name: 'password',
              label: t('password'),
              type: 'password',
              description: t('passwordHint'),
            },
            { name: 'passwordConfirmation', label: t('confirmPassword'), type: 'password' },
          ]}
          submitLabel={t('save')}
          onSubmit={async (values) => {
            await client.api.auth.passwordReset.update({
              body: { ...values, token },
            })
            setDone(true)
          }}
        />
      )}
    </div>
  )
}
