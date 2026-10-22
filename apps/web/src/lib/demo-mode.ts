/**
 * Whether a value of the `VITE_DEMO_MODE` flag turns demo mode on. Only the
 * literal `true` does, so a missing or mistyped flag keeps it off.
 */
export function isDemoMode(value: string | undefined): boolean {
  return value === 'true'
}

/**
 * Demo mode shows the features that only make sense on the showcase of the
 * template, such as the palette picker. New installations have it off.
 */
export const DEMO_MODE = isDemoMode(import.meta.env.VITE_DEMO_MODE)
