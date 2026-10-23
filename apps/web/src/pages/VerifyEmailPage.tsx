import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@dash/ui'
import { client } from '@/lib/api'
import { useI18n } from '@/lib/i18n'

export default function VerifyEmailPage() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * The API sends the visitor here with the outcome of the verification.
   */
  const status = params.get('status')
  const message =
    {
      success: t('verifySuccess'),
      expired: t('verifyExpired'),
      invalid: t('verifyInvalid'),
      already: t('verifyAlready'),
    }[status ?? ''] ?? t('verifyInvalid')

  const canResend = status === 'expired' || status === 'invalid'

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('verifyTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>

      {sent ? <p className="mt-6 text-sm text-muted-foreground">{t('verifyResent')}</p> : null}
      {error ? (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {canResend ? (
        <Button
          className="mt-6"
          onClick={async () => {
            setError(null)
            try {
              const response = await client.api.auth.emailVerification.resend({})
              setSent(response.sent)
              if (!response.sent) {
                setError(t('verifyAlready'))
              }
            } catch {
              setError(t('unknownError'))
            }
          }}
        >
          {t('verifyResend')}
        </Button>
      ) : null}
    </div>
  )
}
