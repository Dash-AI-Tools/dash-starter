import type { ReactNode } from 'react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@dash/ui'
import { cn } from '@/lib/utils'

/**
 * The message shown when there is nothing to display, with an optional action
 * to get out of the empty state.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  /** The icon shown above the title. */
  icon?: ReactNode
  /** The title of the empty state. */
  title: ReactNode
  /** The explanation shown under the title. */
  description?: ReactNode
  /** The action that resolves the empty state. */
  action?: ReactNode
  className?: string
}) {
  return (
    <Empty className={cn('border', className)}>
      <EmptyHeader>
        {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action}
    </Empty>
  )
}
