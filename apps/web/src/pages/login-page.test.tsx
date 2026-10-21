import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import LoginPage from '@/pages/LoginPage'
import { server } from '@/test/server'

const LOGIN = `${API_BASE_URL}/api/v1/auth/login`

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
 * The page the app lands on, with the address it was sent to.
 */
function Destination() {
  const location = useLocation()
  return <p>Dashboard: {location.pathname}</p>
}

function renderLogin(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/app/:orgSlug" element={<Destination />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  it('signs in and lands on the page the visitor wanted', async () => {
    let body: unknown

    server.use(
      http.post(LOGIN, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ user, redirectTo: '/app/acme' })
      })
    )

    const visitor = userEvent.setup()
    renderLogin('/login?redirectTo=%2Fapp%2Facme')

    await visitor.type(screen.getByLabelText('Email'), 'ada@example.com')
    await visitor.type(screen.getByLabelText('Password'), 'supersecret')
    await visitor.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText(/Dashboard/)).toBeInTheDocument()
    })
    expect(screen.getByText('Dashboard: /app/acme')).toBeInTheDocument()
    expect(body).toEqual({
      email: 'ada@example.com',
      password: 'supersecret',
      redirectTo: '/app/acme',
    })
  })

  it('shows the error of the API when the credentials are wrong', async () => {
    server.use(
      http.post(LOGIN, () =>
        HttpResponse.json(
          { code: 'E_INVALID_CREDENTIALS', message: 'Invalid email or password' },
          { status: 401 }
        )
      )
    )

    const visitor = userEvent.setup()
    renderLogin('/login')

    await visitor.type(screen.getByLabelText('Email'), 'ada@example.com')
    await visitor.type(screen.getByLabelText('Password'), 'wrong-password')
    await visitor.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
    })
  })
})
