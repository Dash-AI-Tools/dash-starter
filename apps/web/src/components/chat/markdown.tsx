import { isValidElement, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { Button } from '@dash/ui'
import { useI18n } from '@/lib/i18n'

/**
 * The answer of the assistant, written in Markdown.
 *
 * The output of the model is not trusted: the HTML is sanitized before it
 * reaches the page and the raw HTML of the model is shown as text, so a
 * `<script>` written by the model is never executed.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rawAsText, rehypeSanitize]}
      components={{
        pre: CodeBlock,
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="underline underline-offset-4"
          >
            {children}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  )
}

/**
 * A node of the tree, with the fields that this plugin needs.
 */
type Node = {
  type: string
  value?: string
  children?: Node[]
}

/**
 * Shows the raw HTML of the model as plain text.
 *
 * React Markdown turns the raw HTML into text after the plugins run, but the
 * sanitizer drops it before that, so the words of the model would be lost.
 */
function rawAsText() {
  return (tree: Node) => {
    showRaw(tree)
  }
}

/**
 * Replaces the raw nodes of a tree by text nodes.
 */
function showRaw(node: Node) {
  if (!node.children) return

  node.children = node.children.map((child) => {
    if (child.type === 'raw') {
      return { type: 'text', value: child.value ?? '' }
    }

    showRaw(child)

    return child
  })
}

/**
 * A block of code, with the button that copies it.
 */
function CodeBlock({ children }: { children?: ReactNode }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const code = textOf(children)

  async function copy() {
    if (!navigator.clipboard) return

    await navigator.clipboard.writeText(code)
    setCopied(true)
  }

  return (
    <div className="group relative my-2 overflow-hidden rounded-lg border bg-muted/40">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={copy}
        aria-label={copied ? t('copied') : t('copyCode')}
        className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
      <pre className="overflow-x-auto p-3 text-xs">{children}</pre>
    </div>
  )
}

/**
 * The text of a node, to put it on the clipboard.
 */
function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) {
    return textOf((node.props as { children?: ReactNode }).children)
  }
  return ''
}
