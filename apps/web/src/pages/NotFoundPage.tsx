import { Link } from 'react-router'
import { buttonVariants } from '@dash/ui'
import { useI18n } from '@/lib/i18n'

/**
 * The message shown when no route matches the current URL.
 */
export function NotFoundContent() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-sm font-medium text-muted-foreground">{t('notFound')}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{t('pageNotFound')}</h1>
      <p className="max-w-md text-muted-foreground">{t('pageNotFoundHint')}</p>
      <Link to="/" className={buttonVariants()}>
        {t('goHome')}
      </Link>
    </div>
  )
}

/**
 * The page shown when no route matches the current URL.
 */
export default function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <NotFoundContent />
    </main>
  )
}
