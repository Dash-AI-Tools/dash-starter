import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The header of a page: its title, an optional description and the actions
 * shown on the right.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  /** The title of the page. */
  title: ReactNode
  /** The explanation shown under the title. */
  description?: ReactNode
  /** The actions shown on the right of the header. */
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}
