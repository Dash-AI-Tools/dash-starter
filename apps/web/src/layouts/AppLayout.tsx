import { useState } from 'react'
import { Outlet, useParams } from 'react-router'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/app/error-boundary'
import { SearchPalette } from '@/components/app/search-palette'
import { Sidebar } from '@/components/app/sidebar'
import { TermsGate } from '@/components/app/terms-gate'
import { TopBar } from '@/components/app/top-bar'
import { RequireAuth } from '@/components/auth/require-auth'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { isNotFound } from '@/lib/api-error'
import { useOrganization } from '@/lib/organizations'
import { useSessionExpiredRedirect } from '@/lib/session'
import { useIsMobile } from '@/lib/use-is-mobile'
import NotFoundPage from '@/pages/NotFoundPage'
import { cn } from '@/lib/utils'

/**
 * The key that remembers whether the sidebar is collapsed.
 */
const SIDEBAR_COLLAPSED_KEY = 'sidebar:collapsed'

/**
 * Reads the state the sidebar was left in.
 */
function readCollapsed(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
}

/**
 * The frame of the application: the navigation, the bar on top and the page
 * the visitor asked for.
 */
function AppShell({ orgSlug }: { orgSlug: string }) {
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const { error, isPending } = useOrganization(orgSlug)

  useSessionExpiredRedirect()

  /**
   * An organization the visitor does not belong to does not exist for them.
   */
  if (error && isNotFound(error)) {
    return <NotFoundPage />
  }

  if (isPending) return null

  function toggleCollapsed() {
    setCollapsed((value) => {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!value))
      return !value
    })
  }

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      {isMobile ? (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <Sidebar
              orgSlug={orgSlug}
              collapsed={false}
              onToggle={() => setDrawerOpen(false)}
              onNavigate={() => setDrawerOpen(false)}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <aside
          className={cn(
            'shrink-0 border-r transition-[width]',
            collapsed ? 'w-16' : 'w-64'
          )}
        >
          <Sidebar
            orgSlug={orgSlug}
            collapsed={collapsed}
            onToggle={toggleCollapsed}
          />
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          orgSlug={orgSlug}
          onOpenMenu={() => setDrawerOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <SearchPalette orgSlug={orgSlug} open={searchOpen} onOpenChange={setSearchOpen} />
      <TermsGate />
    </div>
  )
}

export default function AppLayout() {
  const { orgSlug = '' } = useParams()

  return (
    <div className="min-h-svh bg-background text-foreground">
      <ErrorBoundary>
        <RequireAuth>
          <AppShell orgSlug={orgSlug} />
        </RequireAuth>
      </ErrorBoundary>

      <Toaster />
    </div>
  )
}
