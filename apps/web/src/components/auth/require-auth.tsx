import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useCurrentUser } from '@/lib/session'

/**
 * Blocks the pages that need a signed-in user. The visitor is sent to the
 * login page, which brings them back to the page they wanted once they sign
 * in.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { data: user, isPending } = useCurrentUser()

  if (isPending) {
    return null
  }

  if (!user) {
    const redirectTo = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} replace />
  }

  return <>{children}</>
}
