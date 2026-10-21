import { Outlet } from 'react-router'

export default function AppLayout() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <Outlet />
    </main>
  )
}
