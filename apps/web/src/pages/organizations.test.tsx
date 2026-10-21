import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import AcceptInvitationPage from '@/pages/AcceptInvitationPage'
import MembersPage from '@/pages/MembersPage'
import OrganizationSettingsPage from '@/pages/OrganizationSettingsPage'
import { server } from '@/test/server'

const SESSION = `${API_BASE_URL}/api/v1/auth/session`
const ORGANIZATION = `${API_BASE_URL}/api/v1/orgs/:orgSlug`
const MEMBERS = `${API_BASE_URL}/api/v1/orgs/:orgSlug/members`
const INVITATIONS = `${API_BASE_URL}/api/v1/orgs/:orgSlug/invitations`
const INVITATION = `${API_BASE_URL}/api/v1/invitations/:token`

const NOW = '2026-01-01T00:00:00.000Z'

const user = {
  id: 1,
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  emailVerifiedAt: NOW,
  locale: 'en',
  theme: 'system',
  avatarPath: null,
  createdAt: NOW,
  updatedAt: NOW,
  initials: 'AL',
}

const people = {
  ada: { id: 1, fullName: 'Ada Lovelace', email: 'ada@example.com', initials: 'AL' },
  grace: { id: 2, fullName: 'Grace Hopper', email: 'grace@example.com', initials: 'GH' },
  alan: { id: 3, fullName: 'Alan Turing', email: 'alan@example.com', initials: 'AT' },
}

/**
 * A membership as the API returns it.
 */
function membership(id: number, role: string, person: (typeof people)[keyof typeof people]) {
  return {
    id,
    userId: person.id,
    role,
    createdAt: NOW,
    user: { ...person, avatarPath: null, emailVerifiedAt: NOW },
  }
}

/**
 * The organization of the visitor, with the role they hold in it.
 */
function organization(role: string) {
  return {
    id: 10,
    name: 'Acme Labs',
    slug: 'acme-labs',
    logoPath: null,
    defaultLocale: 'en',
    onboardedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    role,
  }
}

/**
 * Serves the organization of the visitor with the given role. An admin also
 * finds the owner of the organization in the list, so the rules about the
 * owner can be checked.
 */
function serveOrganization(role: 'owner' | 'admin' | 'member') {
  const members = [membership(1, role, people.ada), membership(2, 'member', people.grace)]

  if (role === 'admin') {
    members.push(membership(3, 'owner', people.alan))
  }

  server.use(
    http.get(SESSION, () => HttpResponse.json({ user })),
    http.get(ORGANIZATION, () => HttpResponse.json({ organization: organization(role) })),
    http.get(MEMBERS, () => HttpResponse.json({ members })),
    http.get(INVITATIONS, () =>
      HttpResponse.json({
        invitations: [
          {
            id: 5,
            email: 'pending@example.com',
            role: 'member',
            expiresAt: '2026-12-01T00:00:00.000Z',
            acceptedAt: null,
            revokedAt: null,
            createdAt: NOW,
            invitedBy: { id: 1, fullName: 'Ada Lovelace' },
          },
        ],
      })
    )
  )
}

/**
 * Renders a page inside the providers it needs.
 */
function renderPage(page: ReactNode, path: string, route: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={page} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}

function renderMembers(role: 'owner' | 'admin' | 'member') {
  serveOrganization(role)
  return renderPage(<MembersPage />, '/app/acme-labs/members', '/app/:orgSlug/members')
}

function renderSettings(role: 'owner' | 'admin' | 'member') {
  serveOrganization(role)
  return renderPage(
    <OrganizationSettingsPage />,
    '/app/acme-labs/settings',
    '/app/:orgSlug/settings'
  )
}

describe('MembersPage', () => {
  it('shows the directory to a plain member, without the management controls', async () => {
    renderMembers('member')

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: 'Invite a member' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Change the role of Grace Hopper')).not.toBeInTheDocument()
    expect(screen.queryByText('Pending invitations')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave organization' })).toBeInTheDocument()
  })

  it('lets an admin invite the team and change the roles', async () => {
    renderMembers('admin')

    expect(await screen.findByRole('button', { name: 'Invite a member' })).toBeInTheDocument()
    expect(screen.getByLabelText('Change the role of Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('Pending invitations')).toBeInTheDocument()
    expect(await screen.findByText('pending@example.com')).toBeInTheDocument()
  })

  it('keeps an admin away from the owner of the organization', async () => {
    renderMembers('admin')

    expect(await screen.findByText('Alan Turing')).toBeInTheDocument()

    expect(screen.queryByLabelText('Change the role of Alan Turing')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Remove member' })).toHaveLength(2)
  })

  it('sends the invitation of the team', async () => {
    let body: unknown

    server.use(
      http.post(INVITATIONS, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ invitation: { id: 6 } }, { status: 201 })
      })
    )

    renderMembers('admin')

    const visitor = userEvent.setup()
    await visitor.click(await screen.findByRole('button', { name: 'Invite a member' }))

    await visitor.type(await screen.findByLabelText('Email address'), 'new@example.com')
    await visitor.click(screen.getByRole('button', { name: 'Send invitation' }))

    await waitFor(() => {
      expect(body).toEqual({ email: 'new@example.com', role: 'member' })
    })
  })
})

describe('OrganizationSettingsPage', () => {
  it('lets the owner transfer the ownership and delete the organization', async () => {
    renderSettings('owner')

    expect(await screen.findByText('Transfer ownership')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete organization' })).toBeInTheDocument()
  })

  it('keeps the ownership controls away from an admin', async () => {
    renderSettings('admin')

    expect(await screen.findByLabelText('Name')).toBeInTheDocument()

    expect(screen.queryByText('Transfer ownership')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete organization' })).not.toBeInTheDocument()
  })
})

describe('AcceptInvitationPage', () => {
  /**
   * Serves the invitation of the token.
   */
  function serveInvitation(status: 'pending' | 'expired' | 'revoked' | 'accepted') {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user: null })),
      http.get(INVITATION, () =>
        HttpResponse.json({
          invitation: {
            email: 'pending@example.com',
            role: 'member',
            expiresAt: '2026-12-01T00:00:00.000Z',
            status,
            organization: { name: 'Acme Labs', slug: 'acme-labs' },
          },
        })
      )
    )
  }

  function renderInvitation() {
    return renderPage(
      <AcceptInvitationPage />,
      '/invitations/tok-123/accept',
      '/invitations/:token/accept'
    )
  }

  it('asks an anonymous visitor to create an account with the invited email', async () => {
    serveInvitation('pending')
    renderInvitation()

    const link = await screen.findByRole('link', { name: 'Create an account to join Acme Labs' })
    expect(link).toHaveAttribute(
      'href',
      '/signup?email=pending%40example.com&invitation=tok-123'
    )
  })

  it('says that the invitation has expired', async () => {
    serveInvitation('expired')
    renderInvitation()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('This invitation has expired.')
    })
  })

  it('says that the link is not valid', async () => {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user: null })),
      http.get(INVITATION, () =>
        HttpResponse.json({ code: 'E_INVITATION_INVALID', message: 'Invalid' }, { status: 404 })
      )
    )
    renderInvitation()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('This invitation link is not valid.')
    })
  })

  it('refuses an invitation that was sent to another email address', async () => {
    server.use(
      http.get(SESSION, () => HttpResponse.json({ user })),
      http.get(INVITATION, () =>
        HttpResponse.json({
          invitation: {
            email: 'pending@example.com',
            role: 'member',
            expiresAt: '2026-12-01T00:00:00.000Z',
            status: 'pending',
            organization: { name: 'Acme Labs', slug: 'acme-labs' },
          },
        })
      ),
      http.post(`${API_BASE_URL}/api/v1/invitations/:token/accept`, () =>
        HttpResponse.json(
          { code: 'E_INVITATION_MISMATCH', message: 'Another email address' },
          { status: 403 }
        )
      )
    )
    renderInvitation()

    const visitor = userEvent.setup()
    await visitor.click(await screen.findByRole('button', { name: 'Accept invitation' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This invitation was sent to a different email address.'
      )
    })
  })
})
