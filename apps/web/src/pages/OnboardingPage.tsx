import { Navigate } from 'react-router'
import { RequireAuth } from '@/components/auth/require-auth'
import OnboardingWizard from '@/components/onboarding/wizard'
import { useI18n } from '@/lib/i18n'
import { useOnboarding } from '@/lib/onboarding'

/**
 * The setup of the organization of the visitor. The step the wizard shows is
 * the one the API answers with, so the setup is picked up where it was left.
 */
function Onboarding() {
  const { t } = useI18n()
  const { data: onboarding, isPending, isError } = useOnboarding()

  if (isPending) {
    return <p className="p-6 text-sm text-muted-foreground">{t('loading')}</p>
  }

  if (isError || !onboarding) {
    return <p className="p-6 text-sm text-destructive">{t('unknownError')}</p>
  }

  /**
   * Every organization of the visitor is ready already: there is nothing left
   * to set up, so the dashboard is where they belong.
   */
  if (onboarding.step === 'done') {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t('onboardingTitle')}</h1>

      <div className="mt-6">
        <OnboardingWizard onboarding={onboarding} />
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <Onboarding />
    </RequireAuth>
  )
}
