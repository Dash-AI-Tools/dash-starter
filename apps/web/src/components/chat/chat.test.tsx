import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { ChatPanel } from '@/components/chat/chat-panel'
import { API_BASE_URL } from '@/lib/api'
import { I18nProvider } from '@/lib/i18n'
import { server } from '@/test/server'

const CHAT = `${API_BASE_URL}/api/v1/orgs/acme-labs/chat`
const CONVERSATIONS = `${API_BASE_URL}/api/v1/orgs/acme-labs/chat/conversations`
const ORGANIZATION = `${API_BASE_URL}/api/v1/orgs/acme-labs`

/**
 * The state of the chat, as the API returns it.
 */
function chatStatus(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'stub',
    usedCredits: 0,
    limitCredits: 100,
    remainingCredits: 100,
    ...overrides,
  }
}

/**
 * The organization, as the API returns it.
 */
function organization(role = 'member') {
  return {
    organization: { id: 1, name: 'Acme Labs', slug: 'acme-labs', role },
  }
}

/**
 * A conversation of the member, as the API returns it.
 */
function conversation(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    title: 'Members by role',
    createdAt: '2026-01-08T09:12:00.000Z',
    updatedAt: '2026-01-08T09:12:00.000Z',
    ...overrides,
  }
}

/**
 * Serves the state the chat page reads when it opens.
 */
function serveChat(overrides: { status?: Record<string, unknown>; role?: string } = {}) {
  server.use(
    http.get(CHAT, () => HttpResponse.json({ chat: chatStatus(overrides.status) })),
    http.get(CONVERSATIONS, () => HttpResponse.json({ conversations: [] })),
    http.get(ORGANIZATION, () => HttpResponse.json(organization(overrides.role)))
  )
}

/**
 * A stream of answers, as the API sends it.
 */
function answerStream(chunks: unknown[]) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }
      controller.close()
    },
  })

  return new HttpResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

/**
 * Renders the chat of an organization.
 */
function renderChat() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MemoryRouter>
          <ChatPanel orgSlug="acme-labs" />
        </MemoryRouter>
      </I18nProvider>
    </QueryClientProvider>
  )
}

describe('The chat of an organization', () => {
  beforeEach(() => {
    serveChat()
  })

  it('streams the answer of the assistant', async () => {
    let body: unknown

    server.use(
      http.post(CHAT, async ({ request }) => {
        body = await request.json()

        return answerStream([
          { type: 'start', messageId: 'answer-1' },
          { type: 'start-step' },
          { type: 'text-start', id: 'text-1' },
          { type: 'text-delta', id: 'text-1', delta: 'There are ' },
          { type: 'text-delta', id: 'text-1', delta: '2 admins.' },
          { type: 'text-end', id: 'text-1' },
          { type: 'finish-step' },
          { type: 'finish' },
        ])
      })
    )

    const visitor = userEvent.setup()
    renderChat()

    await visitor.type(
      await screen.findByLabelText('Ask anything about your organization…'),
      'How many admins?'
    )
    await visitor.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('There are 2 admins.')).toBeInTheDocument()
    expect(body).toEqual({ message: 'How many admins?' })
  })

  it('stops the answer and keeps what was written', async () => {
    server.use(
      http.post(CHAT, () => {
        const encoder = new TextEncoder()

        /**
         * The answer never ends, the way it does when the member stops it.
         */
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'start', messageId: 'answer-1' })}\n\n`
              )
            )
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'text-start', id: 'text-1' })}\n\n`)
            )
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'text-delta', id: 'text-1', delta: 'There are ' })}\n\n`
              )
            )
          },
        })

        return new HttpResponse(stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      })
    )

    const visitor = userEvent.setup()
    renderChat()

    await visitor.type(
      await screen.findByLabelText('Ask anything about your organization…'),
      'How many admins?'
    )
    await visitor.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('There are')).toBeInTheDocument()

    await visitor.click(await screen.findByRole('button', { name: 'Stop generating' }))

    /**
     * The partial answer stays in the conversation and the chat is ready for
     * the next message.
     */
    expect(screen.getByText('There are')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('shows the script of the model as text and never runs it', async () => {
    server.use(
      http.get(CONVERSATIONS, () => HttpResponse.json({ conversations: [conversation()] })),
      http.get(`${CONVERSATIONS}/7`, () =>
        HttpResponse.json({
          conversation: conversation(),
          messages: [
            {
              id: 1,
              role: 'assistant',
              parts: [{ type: 'text', text: '<script>alert("hacked")</script>' }],
              createdAt: '2026-01-08T09:12:00.000Z',
            },
          ],
        })
      )
    )

    const visitor = userEvent.setup()
    renderChat()

    await visitor.click(await screen.findByRole('button', { name: 'Members by role' }))

    expect(await screen.findByText('<script>alert("hacked")</script>')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })

  it('shows the call of a tool', async () => {
    server.use(
      http.get(CONVERSATIONS, () => HttpResponse.json({ conversations: [conversation()] })),
      http.get(`${CONVERSATIONS}/7`, () =>
        HttpResponse.json({
          conversation: conversation(),
          messages: [
            {
              id: 1,
              role: 'assistant',
              parts: [
                {
                  type: 'tool-list_members',
                  toolCallId: 'call-1',
                  state: 'output-available',
                  input: {},
                  output: { members: 2 },
                },
              ],
              createdAt: '2026-01-08T09:12:00.000Z',
            },
          ],
        })
      )
    )

    const visitor = userEvent.setup()
    renderChat()

    await visitor.click(await screen.findByRole('button', { name: 'Members by role' }))

    expect(await screen.findByText('list_members finished')).toBeInTheDocument()
  })

  it('shows that the provider is a stub', async () => {
    renderChat()

    expect(await screen.findByText('Stub provider')).toBeInTheDocument()
  })

  it('warns when the credits of the organization are running out', async () => {
    serveChat({ status: { usedCredits: 95, limitCredits: 100, remainingCredits: 5 } })

    renderChat()

    expect(await screen.findByText('5 AI credits left')).toBeInTheDocument()
  })

  it('asks an admin to upgrade the plan when there are no credits left', async () => {
    serveChat({ status: { usedCredits: 100, limitCredits: 100, remainingCredits: 0 } })

    renderChat()

    expect(
      await screen.findByText(
        'Your organization has no AI credits left. Ask an admin to upgrade the plan.'
      )
    ).toBeInTheDocument()
  })

  it('shows the link to the plan to the admins', async () => {
    serveChat({
      status: { usedCredits: 100, limitCredits: 100, remainingCredits: 0 },
      role: 'admin',
    })

    renderChat()

    expect(await screen.findByRole('link', { name: 'Upgrade the plan' })).toHaveAttribute(
      'href',
      '/app/acme-labs/settings/billing'
    )
  })

  it('renames a conversation', async () => {
    let body: unknown

    server.use(
      http.get(CONVERSATIONS, () => HttpResponse.json({ conversations: [conversation()] })),
      http.patch(`${CONVERSATIONS}/7`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ conversation: conversation({ title: 'A new name' }) })
      })
    )

    const visitor = userEvent.setup()
    renderChat()

    await visitor.click(await screen.findByRole('button', { name: 'Rename' }))
    await visitor.clear(screen.getByLabelText('Conversation title'))
    await visitor.type(screen.getByLabelText('Conversation title'), 'A new name')
    await visitor.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(body).toEqual({ title: 'A new name' })
    })
  })

  it('deletes a conversation', async () => {
    let deleted = false

    server.use(
      http.get(CONVERSATIONS, () => HttpResponse.json({ conversations: [conversation()] })),
      http.delete(`${CONVERSATIONS}/7`, () => {
        deleted = true
        return HttpResponse.json({ success: true })
      })
    )

    const visitor = userEvent.setup()
    renderChat()

    await visitor.click(await screen.findByRole('button', { name: 'Delete conversation' }))
    await visitor.click(await screen.findByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(deleted).toBe(true)
    })
  })
})
