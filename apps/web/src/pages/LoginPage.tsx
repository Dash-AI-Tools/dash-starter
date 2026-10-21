import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

export default function LoginPage() {
  const { t } = useI18n()

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('signInTitle')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('signInSubtitle')}</p>
      <form className="mt-8 space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            {t('email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            {t('password')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <Button type="submit" className="w-full">
          {t('signIn')}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('noAccount')}{' '}
        <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          {t('signUp')}
        </Link>
      </p>
    </div>
  )
}
