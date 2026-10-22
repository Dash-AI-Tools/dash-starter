import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEMO_MODE } from '@/lib/demo-mode'
import { applyPalette, resolveInitialPalette, storePalette, type PaletteId } from '@/lib/palettes'

type PaletteContextValue = {
  /** The palette applied to the document. */
  palette: PaletteId
  /** Picks another palette; it does nothing when the visitor cannot choose. */
  setPalette: (palette: PaletteId) => void
  /** Whether the visitor may pick a palette: only in demo mode. */
  canChoose: boolean
}

const PaletteContext = createContext<PaletteContextValue | null>(null)

/**
 * Holds the palette of the document. Outside demo mode it is always the
 * default of the product. It never touches light and dark mode, which the
 * theme provider owns.
 */
export function PaletteProvider({
  children,
  canChoose = DEMO_MODE,
}: {
  children: ReactNode
  canChoose?: boolean
}) {
  const [palette, setPaletteState] = useState<PaletteId>(() => resolveInitialPalette(canChoose))

  useEffect(() => {
    applyPalette(palette)
  }, [palette])

  const setPalette = useCallback(
    (next: PaletteId) => {
      if (!canChoose) return
      setPaletteState(next)
      storePalette(next)
    },
    [canChoose]
  )

  const value = useMemo<PaletteContextValue>(
    () => ({ palette, setPalette, canChoose }),
    [palette, setPalette, canChoose]
  )

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
}

export function usePalette() {
  const ctx = useContext(PaletteContext)
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider')
  return ctx
}
