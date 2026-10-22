import { useChat } from '@ai-sdk/react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, MessageSquarePlus, Pencil, Send, Square, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ChatMessage } from '@/components/chat/message'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { client } from '@/lib/api'
import {
  chatFailure,
  chatTransport,
  useChatStatus,
  useConversations,
  useDeleteConversation,
  useRenameConversation,
  type StoredMessage,
} from '@/lib/chat'
import { useI18n } from '@/lib/i18n'
import { orgPath } from '@/lib/nav'
import { canManage, useOrganization } from '@/lib/organizations'
import { cn } from '@/lib/utils'
import type { UIMessage } from 'ai'

/**
 * The chat of an organization: the conversations of the member on the left and
 * the conversation with the assistant on the right.
 */
export function ChatPanel({ orgSlug }: { orgSlug: string }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [conversationId, setConversationId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [renaming, setRenaming] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)

  const { data: conversations = [] } = useConversations(orgSlug)
  const { data: chatStatus } = useChatStatus(orgSlug)
  const { data: organization } = useOrganization(orgSlug)

  const rename = useRenameConversation(orgSlug)
  const remove = useDeleteConversation(orgSlug)

  const { messages, sendMessage, status, stop, error, setMessages, clearError } = useChat({
    transport: chatTransport(orgSlug, {
      conversationId,
      onConversation: setConversationId,
    }),
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations', orgSlug] })
    },
  })

  const busy = status === 'submitted' || status === 'streaming'
  const credits = chatStatus?.remainingCredits ?? null
  const limit = chatStatus?.limitCredits ?? 0
  const exhausted = credits === 0
  const low = credits !== null && limit > 0 && credits > 0 && credits < limit * 0.2
  const failure = chatFailure(error)

  /**
   * Sends what the member wrote. The server keeps the conversation, so the
   * client only sends the message.
   */
  async function send() {
    const text = draft.trim()

    if (!text || busy) return

    setDraft('')
    await sendMessage({ text })
  }

  /**
   * Starts a new conversation, leaving the one that was open behind.
   */
  function startNew() {
    setConversationId(null)
    setMessages([])
  }

  /**
   * Opens a conversation of the member and shows its messages.
   */
  async function open(id: number) {
    setConversationId(id)

    try {
      const response = await client.api.chat.show({ params: { orgSlug, id } })
      setMessages(response.messages.map(toUiMessage))
    } catch {
      toast.error(t('chatErrorTitle'))
    }
  }

  /**
   * Sends the last message again, without repeating it in the conversation.
   */
  function retry() {
    const last = [...messages].reverse().find((message) => message.role === 'user')

    clearError()

    if (!last) return

    setMessages(messages.filter((message) => message.id !== last.id))
    void sendMessage({ text: textOf(last) })
  }

  /**
   * Renames the conversation that is being renamed.
   */
  async function saveRename(event: React.FormEvent) {
    event.preventDefault()

    if (renaming === null) return

    try {
      await rename.mutateAsync({ id: renaming, title: title.trim() })
      toast.success(t('renamed'))
      setRenaming(null)
    } catch {
      toast.error(t('chatErrorTitle'))
    }
  }

  /**
   * Deletes the conversation the member chose.
   */
  async function confirmDelete() {
    if (deleting === null) return

    try {
      await remove.mutateAsync(deleting)
      toast.success(t('conversationDeleted'))

      if (deleting === conversationId) {
        startNew()
      }
    } catch {
      toast.error(t('chatErrorTitle'))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col gap-4 p-6">
      <PageHeader
        title={t('chatTitle')}
        description={t('chatSubtitle')}
        actions={
          <Button type="button" onClick={startNew}>
            <MessageSquarePlus className="size-4" />
            {t('newConversation')}
          </Button>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[18rem_1fr]">
        <aside className="flex min-h-0 flex-col gap-2 overflow-y-auto rounded-lg border p-3">
          <h2 className="text-sm font-medium">{t('conversations')}</h2>

          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('conversationsEmpty')}</p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  {renaming === conversation.id ? (
                    <form className="flex items-center gap-1" onSubmit={saveRename}>
                      <Input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder={t('renamePlaceholder')}
                        aria-label={t('renamePlaceholder')}
                        // eslint-disable-next-line jsx-a11y/no-autofocus -- the user asked to rename, the field takes the focus
                        autoFocus
                      />
                      <Button type="submit" size="icon-sm" aria-label={t('save')}>
                        <Check className="size-4" />
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => open(conversation.id)}
                        className={cn(
                          'h-auto min-w-0 flex-1 justify-start px-2 py-1.5 text-left',
                          conversation.id === conversationId && 'bg-muted'
                        )}
                      >
                        <span className="truncate">
                          {conversation.title ?? t('newConversation')}
                        </span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('rename')}
                        onClick={() => {
                          setRenaming(conversation.id)
                          setTitle(conversation.title ?? '')
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('deleteConversation')}
                        onClick={() => setDeleting(conversation.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
            {chatStatus?.provider === 'stub' ? (
              <Badge variant="secondary">{t('stubBadge')}</Badge>
            ) : null}

            {low ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {t('creditsLeft', { remaining: credits ?? 0 })}
              </span>
            ) : null}

            {chatStatus?.provider === 'stub' ? <span>{t('stubNotice')}</span> : null}
          </div>

          {exhausted ? (
            <div role="alert" className="border-b bg-destructive/10 px-4 py-2 text-sm">
              <p>{t('chatQuotaExhausted')}</p>

              {canManage(organization?.role) ? (
                <Link
                  to={orgPath(orgSlug, 'settings/billing')}
                  className="font-medium underline underline-offset-4"
                >
                  {t('chatUpgradePlan')}
                </Link>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="border-b bg-destructive/10 px-4 py-2 text-sm">
              <p>
                {failure.status === 402
                  ? t('chatQuotaExhausted')
                  : failure.status === 429
                    ? t('chatRateLimited')
                    : t('chatErrorTitle')}
              </p>

              <Button type="button" variant="link" size="sm" onClick={retry}>
                {t('chatRetry')}
              </Button>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <EmptyState
                title={t('chatTitle')}
                description={t('chatSubtitle')}
                className="border-dashed"
              />
            ) : (
              messages.map((message) => <ChatMessage key={message.id} message={message} />)
            )}
          </div>

          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send()
                  }
                }}
                placeholder={t('placeholder')}
                aria-label={t('placeholder')}
                rows={1}
                disabled={exhausted}
              />

              {busy ? (
                <Button type="button" variant="outline" onClick={() => void stop()}>
                  <Square className="size-4" />
                  {t('stop')}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void send()}
                  disabled={!draft.trim() || exhausted}
                >
                  <Send className="size-4" />
                  {t('send')}
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConversation')}</DialogTitle>
            <DialogDescription>{t('deleteConfirm')}</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              {t('cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()}>
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * A message of the API, in the shape the chat renders.
 */
function toUiMessage(message: StoredMessage): UIMessage {
  return {
    id: String(message.id),
    role: message.role as UIMessage['role'],
    parts: message.parts as UIMessage['parts'],
  }
}

/**
 * The text a member wrote.
 */
function textOf(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('')
}
