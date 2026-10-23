import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { client } from '@/lib/api'
import { DEMO_MODE } from '@/lib/demo-mode'
import {
  applyPalette,
  DEFAULT_PALETTE,
  isPaletteId,
  resolveInitialPalette,
  storePalette,
  type PaletteId,
} from '@/lib/palettes'
import { SESSION_QUERY_KEY, useCurrentUser, type CurrentUser } from '@/lib/session'

type PaletteContextValue = {
  /** The palette applied to the document. */
  palette: PaletteId
  /** Picks another palette; it does nothing when the visitor cannot choose. */
  setPalette: (palette: PaletteId) => void
  /** Whether the palette may be picked: a demo visitor or a signed-in user. */
  canChoose: boolean
}

const PaletteContext = createContext<PaletteContextValue | null>(null)

/**
 * Holds the palette of the document. A signed-in user gets the palette saved
 * in the account, and a pick is saved there; a visitor of the demo mode gets
 * the palette of this browser. Outside both, the default of the product
 * applies. It never touches light and dark mode, which the theme provider
 * owns.
 */
export function PaletteProvider({
  children,
  canChoose = DEMO_MODE,
}: {
  children: ReactNode
  /** Whether a signed-out visitor may pick a palette (demo mode). */
  canChoose?: boolean
}) {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()
  const signedIn = !!user

  /**
   * The picks of this session, keyed by account, so the palette of one
   * account never leaks into another. A pick wins over the saved palette
   * until the request answers or fails.
   */
  const [picks, setPicks] = useState<Record<string, PaletteId>>({})
  const key = user ? `user:${user.id}` : 'visitor'

  const saved = user ? (isPaletteId(user.palette) ? user.palette : DEFAULT_PALETTE) : null
  const palette = picks[key] ?? saved ?? resolveInitialPalette(canChoose)

  useEffect(() => {
    applyPalette(palette)
  }, [palette])

  const setPalette = useCallback(
    (next: PaletteId) => {
      if (!signedIn && !canChoose) return

      /**
       * The demo pick belongs to this browser; the pick of an account is
       * saved in the API and reverts if the request fails.
       */
      setPicks((current) => ({ ...current, [key]: next }))

      if (!signedIn) {
        storePalette(next)
        return
      }

      client.api.profile
        .update({ body: { palette: next } })
        .then((response) => {
          queryClient.setQueryData<CurrentUser | null>(SESSION_QUERY_KEY, response.user)
        })
        .catch(() => {
          setPicks((current) => {
            if (current[key] !== next) return current

            const rest = { ...current }
            delete rest[key]
            return rest
          })
        })
    },
    [signedIn, canChoose, key, queryClient]
  )

  const value = useMemo<PaletteContextValue>(
    () => ({ palette, setPalette, canChoose: signedIn || canChoose }),
    [palette, setPalette, signedIn, canChoose]
  )

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
}

export function usePalette() {
  const ctx = useContext(PaletteContext)
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider')
  return ctx
}
