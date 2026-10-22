import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'

/**
 * The page shown when a page of the app fails to render. The visitor can
 * retry, so a transient failure does not send them away.
 */
function ErrorPage({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n()

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <h1 className="text-3xl font-semibold tracking-tight">{t('errorTitle')}</h1>
      <p className="max-w-md text-muted-foreground">{t('errorHint')}</p>
      <Button onClick={onRetry}>{t('retry')}</Button>
    </main>
  )
}

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

/**
 * Catches the errors thrown while the app renders, so a broken page shows a
 * recoverable message instead of a blank screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The app failed to render', error, info)
  }

  render() {
    if (this.state.error) {
      return <ErrorPage onRetry={() => this.setState({ error: null })} />
    }

    return this.props.children
  }
}
