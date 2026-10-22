import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL, client } from '@/lib/api'
import { LOCALE_COOKIE } from '@/lib/i18n'
import { DefaultChatTransport, APICallError, type UIMessage } from 'ai'

/** The state of the chat before the first message. */
export type ChatStatus = Awaited<
  ReturnType<typeof client.api.chat.status>
>['chat']

/** A conversation of the member. */
export type Conversation = Awaited<
  ReturnType<typeof client.api.chat.conversations>
>['conversations'][number]

/** A message of a conversation, as the API stores it. */
export type StoredMessage = Awaited<
  ReturnType<typeof client.api.chat.show>
>['messages'][number]

/**
 * Reads the state of the chat: the provider in use and the credits left.
 */
export function useChatStatus(orgSlug: string) {
  return useQuery({
    queryKey: ['chat', 'status', orgSlug],
    queryFn: async () => (await client.api.chat.status({ params: { orgSlug } })).chat,
  })
}

/**
 * Reads the conversations of the member in the organization.
 */
export function useConversations(orgSlug: string) {
  return useQuery({
    queryKey: ['chat', 'conversations', orgSlug],
    queryFn: async () =>
      (await client.api.chat.conversations({ params: { orgSlug } })).conversations,
  })
}

/**
 * Reads one conversation of the member, with its messages.
 */
export function useConversation(orgSlug: string, id: number | null) {
  return useQuery({
    queryKey: ['chat', 'conversation', orgSlug, id],
    enabled: id !== null,
    queryFn: async () => client.api.chat.show({ params: { orgSlug, id: id as number } }),
  })
}

/**
 * The reason the API refused the last message, so the page can explain it in
 * the language of the member.
 */
export function chatFailure(error: unknown): { status: number; code: string } {
  if (!(error instanceof APICallError)) return { status: 0, code: '' }

  let code: string

  try {
    code = (JSON.parse(error.responseBody ?? '') as { code?: string }).code ?? ''
  } catch {
    code = ''
  }

  return { status: error.statusCode ?? 0, code }
}

/**
 * Renames a conversation of the member.
 */
export function useRenameConversation(orgSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) =>
      client.api.chat.rename({ params: { orgSlug, id }, body: { title } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', orgSlug] }),
  })
}

/**
 * Deletes a conversation of the member.
 */
export function useDeleteConversation(orgSlug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) =>
      client.api.chat.destroy({ params: { orgSlug, id } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', orgSlug] }),
  })
}

/**
 * The transport that carries the messages to the API.
 *
 * The server keeps the conversation, so the client only sends the message it
 * wrote and the conversation it is talking about. The identifier of a new
 * conversation comes back in a header of the answer, because the stream of the
 * reply does not carry it.
 */
export function chatTransport(
  orgSlug: string,
  options: {
    /** The conversation the member is talking to, when there is one. */
    conversationId: number | null
    /** Called with the identifier of the conversation the API used. */
    onConversation: (id: number) => void
  }
) {
  return new DefaultChatTransport({
    api: `${API_BASE_URL}/api/v1/orgs/${orgSlug}/chat`,
    credentials: 'include',
    headers: () => chatHeaders(),
    prepareSendMessagesRequest: ({ messages }) => ({
      body: {
        conversationId: options.conversationId ?? undefined,
        message: lastMessageText(messages),
      },
    }),
    fetch: async (input, init) => {
      const response = await fetch(input, init)
      const id = response.headers.get('x-conversation-id')

      if (id) {
        options.onConversation(Number(id))
      }

      return response
    },
  })
}

/**
 * The text the member wrote, as the API expects it.
 */
function lastMessageText(messages: UIMessage[]): string {
  const last = messages[messages.length - 1]

  if (!last) return ''

  return last.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

/**
 * The headers every request of the chat carries: the token of the session and
 * the language of the member.
 */
function chatHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}

  const xsrf = readCookie('XSRF-TOKEN')
  if (xsrf) headers['x-xsrf-token'] = xsrf

  const locale = readCookie(LOCALE_COOKIE)
  if (locale) headers['Accept-Language'] = locale

  return headers
}

/**
 * Reads a cookie of the browser.
 */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`)
  )

  return match?.[1] ? decodeURIComponent(match[1]) : null
}
