import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ConsentBanner } from '@/components/consent/consent-banner'
import { ConsentPreferences } from '@/components/consent/consent-preferences'
import { ConsentScripts } from '@/components/consent/consent-scripts'
import {
  DEFAULT_CHOICES,
  OPEN_COOKIE_PREFERENCES,
  readConsent,
  writeConsent,
  type ConsentCategory,
  type ConsentChoices,
} from '@/lib/consent'

type ConsentContextValue = {
  /** The choice of the visitor, or null while they have not decided yet. */
  choices: ConsentChoices | null
  /** Whether a category of cookies is allowed. */
  isAllowed: (category: ConsentCategory) => boolean
  /** Grants every category. */
  acceptAll: () => void
  /** Grants only the necessary cookies. */
  rejectNonEssential: () => void
  /** Stores the choice of the visitor. */
  save: (choices: ConsentChoices) => void
  /** Opens the preferences of the cookies. */
  openPreferences: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

/**
 * Holds the consent of the visitor and asks for it when it is missing.
 *
 * The banner and the preferences are rendered here, so the choice can be
 * changed from any page of the product.
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const [choices, setChoices] = useState<ConsentChoices | null>(
    () => readConsent()?.categories ?? null
  )
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  const save = useCallback((next: ConsentChoices) => {
    writeConsent(next)
    setChoices(next)
  }, [])

  /**
   * The menu of the account and the footer of the public site open the
   * preferences with an event, so they do not have to know the module.
   */
  useEffect(() => {
    function onOpen() {
      setPreferencesOpen(true)
    }

    window.addEventListener(OPEN_COOKIE_PREFERENCES, onOpen)
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES, onOpen)
  }, [])

  const value = useMemo<ConsentContextValue>(
    () => ({
      choices,
      isAllowed: (category) => (category === 'necessary' ? true : (choices?.[category] ?? false)),
      acceptAll: () => save({ necessary: true, analytics: true, marketing: true }),
      rejectNonEssential: () => save(DEFAULT_CHOICES),
      save,
      openPreferences: () => setPreferencesOpen(true),
    }),
    [choices, save]
  )

  return (
    <ConsentContext.Provider value={value}>
      {children}

      <ConsentScripts />
      {choices === null ? <ConsentBanner /> : null}
      <ConsentPreferences open={preferencesOpen} onOpenChange={setPreferencesOpen} />
    </ConsentContext.Provider>
  )
}

/**
 * The consent of the visitor.
 */
export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent must be used within ConsentProvider')
  return ctx
}
