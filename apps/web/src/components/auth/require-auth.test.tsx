import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { RequireAuth } from '@/components/auth/require-auth'
import { API_BASE_URL } from '@/lib/api'
import { server } from '@/test/server'

const SESSION = `${API_BASE_URL}/api/v1/auth/session`

const user = {
  id: 1,
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: null,
  locale: 'en',
  theme: 'system',
  avatarPath: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  initials: 'AL',
}

/**
 * The page the visitor lands on, with the address it was sent to.
 */
function LoginPage() {
  const location = useLocation()
  return <p>Login page: {new URLSearchParams(location.search).get('redirectTo')}</p>
}

function renderGuard(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/app/:orgSlug"
            element={
              <RequireAuth>
                <p>Members</p>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RequireAuth', () => {
  it('sends an anonymous visitor to the login page with the page they wanted', async () => {
    server.use(http.get(SESSION, () => HttpResponse.json({ user: null })))

    renderGuard('/app/acme?tab=members')

    await waitFor(() => {
      expect(screen.getByText(/Login page/)).toBeInTheDocument()
    })
    expect(screen.getByText(/Login page/)).toHaveTextContent('Login page: /app/acme?tab=members')
  })

  it('shows the page to a signed-in visitor', async () => {
    server.use(http.get(SESSION, () => HttpResponse.json({ user })))

    renderGuard('/app/acme')

    await waitFor(() => {
      expect(screen.getByText('Members')).toBeInTheDocument()
    })
  })
})
