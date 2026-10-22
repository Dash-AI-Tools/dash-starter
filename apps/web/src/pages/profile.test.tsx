import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { TermsGate } from '@/components/app/terms-gate'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import ProfilePage from '@/pages/ProfilePage'
import { ThemeProvider } from '@/providers/theme-provider'
import { server } from '@/test/server'

const SESSION = `${API_BASE_URL}/api/v1/auth/session`
const PROFILE = `${API_BASE_URL}/api/v1/account/profile`
const AVATAR = `${API_BASE_URL}/api/v1/account/profile/avatar`
const EMAIL = `${API_BASE_URL}/api/v1/account/profile/email`
const PASSWORD = `${API_BASE_URL}/api/v1/account/profile/password`
const TERMS = `${API_BASE_URL}/api/v1/account/terms`

const NOW = '2026-01-01T00:00:00.000Z'

const user = {
  id: 1,
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: NOW,
  locale: 'en',
  theme: 'system',
  avatarPath: null,
  pendingEmail: null,
  termsVersion: '2026-01-01',
  lastOrganizationId: 10,
  createdAt: NOW,
  updatedAt: NOW,
  initials: 'AL',
}

/**
 * Serves the session of the visitor.
 */
function serveSession(overrides: Partial<typeof user> = {}) {
  server.use(http.get(SESSION, () => HttpResponse.json({ user: { ...user, ...overrides } })))
}

/**
 * Renders a page inside the providers it needs.
 */
function renderPage(page: React.ReactNode, path = '/app/acme-labs/profile') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/app/:orgSlug/profile" element={page} />
            </Routes>
          </MemoryRouter>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

/**
 * The card of the page with the given title, so the fields of two forms with
 * the same name do not get mixed up.
 */
async function card(title: string) {
  const found = await screen.findByText(title, { selector: '[data-slot="card-title"]' })

  return within(found.closest('[data-slot="card"]') as HTMLElement)
}

/**
 * A picture of the given type and size, in bytes.
 */
function picture(type: string, size: number) {
  return new File(['x'.repeat(size)], 'avatar', { type })
}

beforeEach(() => {
  localStorage.clear()
  document.cookie = 'locale=; path=/; max-age=0'
})

describe('ProfilePage', () => {
  it('shows the identity and the preferences of the visitor', async () => {
    serveSession()
    renderPage(<ProfilePage />)

    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect((await card('Full name')).getByLabelText('Full name')).toHaveValue('Ada Lovelace')
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByLabelText('Language')).toHaveValue('en')
    expect(screen.getByLabelText('Theme')).toHaveValue('system')
  })

  it('saves the name of the visitor', async () => {
    let body: unknown

    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.patch(PROFILE, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ user: { ...user, fullName: 'Ada L.' } })
      })
    )

    renderPage(<ProfilePage />)

    const visitor = userEvent.setup()
    const name = await screen.findByLabelText('Full name')

    await visitor.clear(name)
    await visitor.type(name, 'Ada L.')
    await visitor.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(body).toEqual({ fullName: 'Ada L.' })
    })
  })

  it('rejects an avatar that is not an accepted format', async () => {
    serveSession()
    renderPage(<ProfilePage />)

    /**
     * The picker of the browser only offers the accepted formats, so the file
     * is dropped in the input the way a drag and drop would.
     */
    fireEvent.change(await screen.findByLabelText('Avatar'), {
      target: { files: [picture('image/gif', 1024)] },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Use a PNG, JPEG or WebP image up to 2 MB.'
    )
  })

  it('rejects an avatar bigger than 2 MB', async () => {
    serveSession()
    renderPage(<ProfilePage />)

    const visitor = userEvent.setup()
    await visitor.upload(
      await screen.findByLabelText('Avatar'),
      picture('image/png', 2 * 1024 * 1024 + 1)
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Use a PNG, JPEG or WebP image up to 2 MB.'
    )
  })

  it('uploads an accepted avatar', async () => {
    let upload: FormData | undefined

    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.post(AVATAR, async ({ request }) => {
        upload = await request.formData()
        return HttpResponse.json({
          user: { ...user, avatarPath: '/api/uploads/avatars/1/photo.png' },
        })
      })
    )

    renderPage(<ProfilePage />)

    const visitor = userEvent.setup()
    await visitor.upload(await screen.findByLabelText('Avatar'), picture('image/png', 1024))

    await waitFor(
      () => {
        expect(upload?.get('avatar')).toBeTruthy()
      },
      { timeout: 5000 }
    )
    expect((upload?.get('avatar') as File).type).toBe('image/png')
    expect((upload?.get('avatar') as File).size).toBe(1024)
  })

  it('asks for the change of the email address', async () => {
    let body: unknown

    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.post(EMAIL, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ sent: true })
      })
    )

    renderPage(<ProfilePage />)

    const visitor = userEvent.setup()
    const form = await card('Change email')

    await visitor.type(form.getByLabelText('New email address'), 'ada@new.example.com')
    await visitor.type(form.getByLabelText('Current password'), 'supersecret')
    await visitor.click(form.getByRole('button', { name: 'Change email' }))

    await waitFor(() => {
      expect(body).toEqual({
        email: 'ada@new.example.com',
        currentPassword: 'supersecret',
      })
    })
  })

  it('shows the error of a wrong current password', async () => {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.post(PASSWORD, () =>
        HttpResponse.json(
          {
            code: 'E_VALIDATION_ERROR',
            errors: [
              {
                field: 'currentPassword',
                code: 'current_password_invalid',
                message: 'The current password is not correct',
              },
            ],
          },
          { status: 422 }
        )
      )
    )

    renderPage(<ProfilePage />)

    const visitor = userEvent.setup()
    const form = await card('Change password')

    await visitor.type(form.getByLabelText('Current password'), 'wrong')
    await visitor.type(form.getByLabelText('New password'), 'supersecret')
    await visitor.type(form.getByLabelText('Confirm new password'), 'supersecret')
    await visitor.click(form.getByRole('button', { name: 'Change password' }))

    expect(await form.findByText('The current password is not correct')).toBeInTheDocument()
  })

  it('changes the password', async () => {
    let body: unknown

    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.post(PASSWORD, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ success: true })
      })
    )

    renderPage(<ProfilePage />)

    const visitor = userEvent.setup()
    const form = await card('Change password')

    await visitor.type(form.getByLabelText('Current password'), 'supersecret')
    await visitor.type(form.getByLabelText('New password'), 'newsupersecret')
    await visitor.type(form.getByLabelText('Confirm new password'), 'newsupersecret')
    await visitor.click(form.getByRole('button', { name: 'Change password' }))

    await waitFor(() => {
      expect(body).toEqual({
        currentPassword: 'supersecret',
        password: 'newsupersecret',
        passwordConfirmation: 'newsupersecret',
      })
    })
  })

  it('remembers the language of the visitor on the server', async () => {
    let body: unknown

    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.patch(PROFILE, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ user })
      })
    )

    renderPage(<ProfilePage />)

    const visitor = userEvent.setup()
    await visitor.selectOptions(await screen.findByLabelText('Language'), 'es')

    await waitFor(() => {
      expect(body).toEqual({ locale: 'es' })
    })
  })

  it('refuses to delete the account of the only owner of an organization', async () => {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.delete(PROFILE, () =>
        HttpResponse.json(
          {
            code: 'E_VALIDATION_ERROR',
            errors: [
              {
                field: 'password',
                code: 'delete_blocked',
                message:
                  'You are the only owner of an organization that has other members or an active paid subscription. Transfer the ownership or delete the organization first.',
              },
            ],
          },
          { status: 422 }
        )
      )
    )

    renderPage(<ProfilePage />)

    const visitor = userEvent.setup()
    await visitor.click(await screen.findByRole('button', { name: 'Delete account' }))

    const dialog = within(await screen.findByRole('dialog'))
    await visitor.type(dialog.getByLabelText('Type your password to confirm'), 'supersecret')
    await visitor.click(dialog.getByRole('button', { name: 'Delete account' }))

    expect(await dialog.findByText(/You are the only owner of an organization/)).toBeInTheDocument()
  })
})

describe('TermsGate', () => {
  it('asks the visitor to accept the new terms', async () => {
    serveSession({ termsVersion: '2025-01-01' })

    renderPage(<TermsGate />)

    expect(
      await screen.findByRole('heading', { name: 'Please accept the updated terms' })
    ).toBeInTheDocument()
  })

  it('accepts the new terms and remembers them', async () => {
    let called = false

    server.use(
      http.get(SESSION, () => HttpResponse.json({ user: { ...user, termsVersion: '2025-01-01' } })),
      http.post(TERMS, () => {
        called = true
        return HttpResponse.json({ user })
      })
    )

    renderPage(<TermsGate />)

    const visitor = userEvent.setup()
    await visitor.click(await screen.findByRole('button', { name: 'Accept and continue' }))

    await waitFor(() => {
      expect(called).toBe(true)
    })
    expect(screen.queryByRole('heading', { name: 'Please accept the updated terms' })).toBeNull()
  })

  it('does not ask a visitor with the current terms', async () => {
    serveSession()

    renderPage(<TermsGate />)

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Please accept the updated terms' })).toBeNull()
    })
  })
})
