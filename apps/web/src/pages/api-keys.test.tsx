import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import ApiKeysPage from '@/pages/ApiKeysPage'
import { server } from '@/test/server'

const KEYS = `${API_BASE_URL}/api/v1/orgs/acme-labs/api-keys`

/**
 * A key of the organization, as the API returns it.
 */
function apiKey(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Claude Desktop',
    prefix: 'dash_ab12cd34',
    scopes: ['mcp:read'],
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    calls: 42,
    ...overrides,
  }
}

/**
 * Serves the keys of the organization and the calls they made.
 */
function serveKeys(state: () => Record<string, unknown> = () => ({})) {
  server.use(
    http.get(KEYS, () =>
      HttpResponse.json({
        apiKeys: [apiKey()],
        usage: { total: 42, limit: 1000 },
        mcpEnabled: true,
        ...state(),
      })
    )
  )
}

/**
 * Renders the API keys of an organization.
 */
function renderApiKeys(path = '/app/acme-labs/settings/api-keys') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/app/:orgSlug/settings/api-keys" element={<ApiKeysPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}

describe('The API keys of an organization', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  it('shows the keys and the calls of the period', async () => {
    serveKeys()

    renderApiKeys()

    expect(await screen.findByText('Claude Desktop')).toBeInTheDocument()
    expect(screen.getByText('dash_ab12cd34')).toBeInTheDocument()
    expect(screen.getByText('mcp:read')).toBeInTheDocument()
    expect(screen.getByText('42 of 1000')).toBeInTheDocument()
  })

  it('creates a key and shows its secret only once', async () => {
    let body: unknown

    serveKeys()

    server.use(
      http.post(KEYS, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ apiKey: apiKey({ id: 2 }), secret: 'dash_the_secret' })
      })
    )

    const visitor = userEvent.setup()
    renderApiKeys()

    await visitor.click(await screen.findByRole('button', { name: 'Create API key' }))
    await visitor.type(await screen.findByLabelText('Key name'), 'Claude Desktop')
    await visitor.click(screen.getByRole('button', { name: 'Create key' }))

    expect(await screen.findByText('dash_the_secret')).toBeInTheDocument()
    expect(body).toEqual({ name: 'Claude Desktop', scopes: ['mcp:read'] })
  })

  it('revokes a key', async () => {
    let revoked = false

    serveKeys()

    server.use(
      http.delete(`${KEYS}/1`, () => {
        revoked = true
        return HttpResponse.json({ success: true })
      })
    )

    const visitor = userEvent.setup()
    renderApiKeys()

    await visitor.click(await screen.findByRole('button', { name: 'Revoke' }))
    await visitor.click(await screen.findByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(revoked).toBe(true)
    })
  })

  it('tells the admins when the plan does not reach the server', async () => {
    server.use(
      http.get(KEYS, () =>
        HttpResponse.json({
          apiKeys: [],
          usage: { total: 0, limit: 0 },
          mcpEnabled: false,
        })
      )
    )

    renderApiKeys()

    expect(
      await screen.findByText('API keys are not available on your plan. Upgrade to unlock MCP.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create API key' })).not.toBeInTheDocument()
  })
})
