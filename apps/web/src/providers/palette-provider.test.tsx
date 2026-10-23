import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { API_BASE_URL } from '@/lib/api'
import { DEFAULT_PALETTE } from '@/lib/palettes'
import { PaletteProvider, usePalette } from '@/providers/palette-provider'
import { ThemeProvider, useTheme } from '@/providers/theme-provider'
import { server } from '@/test/server'

const SESSION = `${API_BASE_URL}/api/v1/auth/session`
const PROFILE = `${API_BASE_URL}/api/v1/account/profile`

const USER = {
  id: 1,
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  locale: 'en',
  theme: 'system',
  palette: null,
  avatarPath: null,
  pendingEmail: null,
  termsVersion: '2026-01-01',
  lastOrganizationId: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  initials: 'AL',
}

function Controls() {
  const { palette, setPalette } = usePalette()
  const { setTheme } = useTheme()

  return (
    <div>
      <span data-testid="palette">{palette}</span>
      <button type="button" onClick={() => setPalette('ember')}>
        ember
      </button>
      <button type="button" onClick={() => setTheme('dark')}>
        dark
      </button>
    </div>
  )
}

/**
 * Renders the provider with a session. `session` is the palette saved in the
 * account, or `null` for a visitor.
 */
function renderProvider(
  canChoose: boolean,
  options: { session?: string | null; saved?: { palette: string | null } } = {}
) {
  const saved = options.saved ?? { palette: options.session ?? null }
  const session = options.session === undefined ? null : options.session

  server.use(
    http.get(SESSION, () =>
      HttpResponse.json({ user: session ? { ...USER, palette: session } : null })
    ),
    http.patch(PROFILE, async ({ request }) => {
      const body = (await request.json()) as { palette: string }
      saved.palette = body.palette
      return HttpResponse.json({ user: { ...USER, palette: body.palette } })
    })
  )

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PaletteProvider canChoose={canChoose}>
          <Controls />
        </PaletteProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

describe('PaletteProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    delete document.documentElement.dataset.palette
  })

  it('paints the document with the default palette', async () => {
    renderProvider(false)

    await waitFor(() => expect(screen.getByTestId('palette')).toHaveTextContent(DEFAULT_PALETTE))
    expect(document.documentElement.dataset.palette).toBe(DEFAULT_PALETTE)
  })

  it('adopts the palette saved in the account', async () => {
    renderProvider(false, { session: 'plum' })

    await waitFor(() => expect(screen.getByTestId('palette')).toHaveTextContent('plum'))
    expect(document.documentElement.dataset.palette).toBe('plum')
  })

  it('saves the pick of a signed-in user and keeps it across a remount', async () => {
    const saved = { palette: 'plum' as string | null }
    const user = userEvent.setup()
    const { unmount } = renderProvider(false, { session: 'plum', saved })

    await waitFor(() => expect(screen.getByTestId('palette')).toHaveTextContent('plum'))

    await user.click(screen.getByRole('button', { name: 'ember' }))

    await waitFor(() => expect(saved.palette).toBe('ember'))
    expect(document.documentElement.dataset.palette).toBe('ember')
    expect(localStorage.getItem('palette')).toBeNull()

    unmount()
    renderProvider(false, { session: 'ember', saved })

    await waitFor(() => expect(screen.getByTestId('palette')).toHaveTextContent('ember'))
  })

  it('reverts the pick when the update fails', async () => {
    server.use(http.patch(PROFILE, () => HttpResponse.json({ message: 'nope' }, { status: 500 })))
    server.use(http.get(SESSION, () => HttpResponse.json({ user: { ...USER, palette: 'plum' } })))

    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider>
          <PaletteProvider canChoose={false}>
            <Controls />
          </PaletteProvider>
        </ThemeProvider>
      </QueryClientProvider>
    )

    await waitFor(() => expect(screen.getByTestId('palette')).toHaveTextContent('plum'))
    await user.click(screen.getByRole('button', { name: 'ember' }))

    await waitFor(() => expect(screen.getByTestId('palette')).toHaveTextContent('plum'))
    expect(document.documentElement.dataset.palette).toBe('plum')
  })

  it('applies and remembers the pick of a demo visitor, without touching dark mode', async () => {
    const user = userEvent.setup()
    renderProvider(true)

    await user.click(screen.getByRole('button', { name: 'ember' }))

    expect(document.documentElement.dataset.palette).toBe('ember')
    expect(localStorage.getItem('palette')).toBe('ember')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('keeps the palette when the visitor switches to dark mode', async () => {
    const user = userEvent.setup()
    renderProvider(true)

    await user.click(screen.getByRole('button', { name: 'ember' }))
    await user.click(screen.getByRole('button', { name: 'dark' }))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.palette).toBe('ember')
  })

  it('ignores picks and stored palettes outside demo mode', async () => {
    const user = userEvent.setup()
    localStorage.setItem('palette', 'plum')
    renderProvider(false)

    await user.click(screen.getByRole('button', { name: 'ember' }))

    expect(screen.getByTestId('palette')).toHaveTextContent(DEFAULT_PALETTE)
    expect(document.documentElement.dataset.palette).toBe(DEFAULT_PALETTE)
    expect(localStorage.getItem('palette')).toBe('plum')
  })
})
