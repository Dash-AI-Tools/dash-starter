import { useConsent } from '@/providers/consent-provider'
import { registeredScripts } from '@/lib/consent'

/**
 * The scripts that only run when the visitor grants their category.
 *
 * A script that is not allowed is not in the document, so the browser never
 * asks for it. When the visitor grants the category later, the script is
 * added to the page without a reload.
 */
export function ConsentScripts() {
  const { isAllowed } = useConsent()

  return (
    <>
      {registeredScripts().map((script) =>
        isAllowed(script.category) ? <script key={script.id} src={script.src} async /> : null
      )}
    </>
  )
}
