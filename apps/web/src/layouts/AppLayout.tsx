import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { RequireAuth } from '@/components/auth/require-auth'

export default function AppLayout() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <RequireAuth>
        <Outlet />
      </RequireAuth>

      <Toaster />
    </main>
  )
}
