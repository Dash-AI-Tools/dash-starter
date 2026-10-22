import { Wrench } from 'lucide-react'
import type { UIMessage } from 'ai'
import { Markdown } from '@/components/chat/markdown'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type UIPart = UIMessage['parts'][number]

/** A part of a message that calls a tool of the product. */
type ToolPart =
  Extract<UIPart, { type: `tool-${string}` }> | Extract<UIPart, { type: 'dynamic-tool' }>

/**
 * A message of the conversation: what the member wrote and what the assistant
 * answered.
 */
export function ChatMessage({ message }: { message: UIMessage }) {
  const { t } = useI18n()
  const fromMember = message.role === 'user'

  return (
    <article className={cn('flex flex-col gap-1', fromMember ? 'items-end' : 'items-start')}>
      <span className="text-xs font-medium text-muted-foreground">
        {fromMember ? t('you') : t('assistant')}
      </span>

      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          fromMember ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
        )}
      >
        {message.parts.map((part, index) => (
          <MessagePart key={index} part={part} fromMember={fromMember} />
        ))}
      </div>
    </article>
  )
}

/**
 * A part of a message.
 */
function MessagePart({ part, fromMember }: { part: UIPart; fromMember: boolean }) {
  if (part.type === 'text') {
    return fromMember ? (
      <p className="whitespace-pre-wrap">{part.text}</p>
    ) : (
      <Markdown>{part.text}</Markdown>
    )
  }

  if (isToolPart(part)) {
    return <ToolCall part={part} />
  }

  return null
}

/**
 * The call of a tool, shown to the member so the answer of the assistant can
 * be trusted.
 */
function ToolCall({ part }: { part: ToolPart }) {
  const { t } = useI18n()

  const name = part.type === 'dynamic-tool' ? part.toolName : part.type.slice(5)
  const output = part.state === 'output-available' ? part.output : undefined
  const denied = isRefused(output)

  let label = t('toolCall', { tool: name })

  if (denied) {
    label = t('toolDenied', { tool: name })
  } else if (part.state === 'output-available') {
    label = t('toolResult', { tool: name })
  }

  return (
    <div className="my-1 flex items-center gap-2 rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">
      <Wrench className="size-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  )
}

/**
 * Whether a part is the call of a tool.
 */
function isToolPart(part: UIPart): part is ToolPart {
  return part.type === 'dynamic-tool' || part.type.startsWith('tool-')
}

/**
 * Whether the tool was refused. The registry answers with the error and a
 * message for the model, and no data of the organization.
 */
function isRefused(output: unknown): boolean {
  return typeof output === 'object' && output !== null && 'error' in output
}
