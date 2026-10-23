import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { PalettePicker } from '@/components/palette-picker'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import { PaletteProvider } from '@/providers/palette-provider'
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

function renderPicker(canChoose: boolean, session: string | null = null) {
  server.use(
    http.get(SESSION, () =>
      HttpResponse.json({ user: session ? { ...USER, palette: session } : null })
    ),
    http.patch(PROFILE, async ({ request }) => {
      const body = (await request.json()) as { palette: string }
      return HttpResponse.json({ user: { ...USER, palette: body.palette } })
    })
  )

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <PaletteProvider canChoose={canChoose}>
          <PalettePicker />
        </PaletteProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}

describe('PalettePicker', () => {
  beforeEach(() => {
    localStorage.clear()
    document.cookie = 'locale=; path=/; max-age=0'
    delete document.documentElement.dataset.palette
  })

  it('renders nothing for a visitor outside demo mode', async () => {
    const { container } = renderPicker(false)

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('re-colours the page at once when a palette is picked', async () => {
    const user = userEvent.setup()
    renderPicker(true)

    await user.click(await screen.findByRole('button', { name: 'Color palette: Line' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Plum' }))

    expect(document.documentElement.dataset.palette).toBe('plum')
    expect(screen.getByRole('button', { name: 'Color palette: Plum' })).toBeInTheDocument()
  })

  it('renders for a signed-in user with demo mode off', async () => {
    const user = userEvent.setup()
    renderPicker(false, 'ocean')

    await user.click(await screen.findByRole('button', { name: 'Color palette: Ocean' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Ember' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Color palette: Ember' })).toBeInTheDocument()
    )
    expect(document.documentElement.dataset.palette).toBe('ember')
  })

  it('announces the palette in use as checked', async () => {
    const user = userEvent.setup()
    renderPicker(true)

    await user.click(await screen.findByRole('button', { name: 'Color palette: Line' }))

    expect(await screen.findByRole('menuitemradio', { name: 'Line' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByRole('menuitemradio', { name: 'Ocean' })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('is operable from the keyboard', async () => {
    const user = userEvent.setup()
    renderPicker(true)

    await screen.findByRole('button', { name: 'Color palette: Line' })
    screen.getByRole('button', { name: 'Color palette: Line' }).focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('menuitemradio', { name: 'Line' })
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(document.documentElement.dataset.palette).toBe('ocean')
  })

  it('names the palettes in Spanish', async () => {
    document.cookie = 'locale=es; path=/'
    const user = userEvent.setup()
    renderPicker(true)

    await user.click(await screen.findByRole('button', { name: 'Paleta de colores: Línea' }))

    expect(await screen.findByRole('menuitemradio', { name: 'Brasa' })).toBeInTheDocument()
  })
})
