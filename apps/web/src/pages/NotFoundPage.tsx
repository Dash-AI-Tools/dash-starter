import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

/**
 * The page shown when no route matches the current URL.
 */
export default function NotFoundPage() {
  const { t } = useI18n()

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <p className="text-sm font-medium text-muted-foreground">{t('notFound')}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{t('pageNotFound')}</h1>
      <p className="max-w-md text-muted-foreground">{t('pageNotFoundHint')}</p>
      <Button render={<Link to="/" />}>{t('goHome')}</Button>
    </main>
  )
}
