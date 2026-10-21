import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Form } from '@/components/patterns/form'
import { client } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useSetCurrentUser } from '@/lib/session'

export default function LoginPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const setCurrentUser = useSetCurrentUser()

  /**
   * The page the visitor wanted before the session was checked. The API only
   * accepts same-origin destinations, so a foreign one is ignored.
   */
  const redirectTo = params.get('redirectTo')

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('invalidEmail')),
        password: z.string().min(8, t('passwordTooShort')),
      }),
    [t]
  )

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('signInTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('signInSubtitle')}</p>

      <Form
        className="mt-8"
        schema={schema}
        fields={[
          { name: 'email', label: t('email'), type: 'email' },
          { name: 'password', label: t('password'), type: 'password' },
        ]}
        submitLabel={t('signIn')}
        onSubmit={async (values) => {
          const response = await client.api.auth.session.login({
            body: { ...values, redirectTo: redirectTo ?? undefined },
          })

          setCurrentUser(response.user)
          navigate(response.redirectTo ?? '/app', { replace: true })
        }}
      >
        <p className="text-sm text-muted-foreground">
          <Link to="/forgot-password" className="underline-offset-4 hover:underline">
            {t('forgotPassword')}
          </Link>
        </p>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          {t('signUp')}
        </Link>
      </p>
    </div>
  )
}
