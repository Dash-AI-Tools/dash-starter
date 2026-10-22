import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { z } from 'zod'
import { Form } from '@/components/patterns/form'
import { client } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [sent, setSent] = useState(false)

  const schema = useMemo(() => z.object({ email: z.string().email(t('invalidEmail')) }), [t])

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('forgotTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('forgotBody')}</p>

      {sent ? (
        <p className="mt-8 text-sm text-muted-foreground">{t('forgotSent')}</p>
      ) : (
        <Form
          className="mt-8"
          schema={schema}
          fields={[{ name: 'email', label: t('email'), type: 'email' }]}
          submitLabel={t('continue')}
          onSubmit={async (values) => {
            await client.api.auth.passwordReset.store({ body: values })
            setSent(true)
          }}
        />
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="underline-offset-4 hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  )
}
