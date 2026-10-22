import { cn } from '@/lib/utils'

/**
 * The mark of the product: a line with three stations, on the colour of the
 * line. It follows the tokens, so a rebrand recolours it too.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-7 shrink-0', className)}>
      <rect width="32" height="32" rx="8" fill="var(--line)" />
      <path d="M6 16h20" stroke="var(--background)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="9" cy="16" r="3.25" fill="var(--background)" />
      <circle
        cx="16"
        cy="16"
        r="3.25"
        fill="var(--line)"
        stroke="var(--background)"
        strokeWidth="2.5"
      />
      <circle cx="23" cy="16" r="3.25" fill="var(--background)" />
    </svg>
  )
}
