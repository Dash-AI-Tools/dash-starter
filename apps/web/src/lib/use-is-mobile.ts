import { useEffect, useState } from 'react'

/**
 * The width under which the navigation becomes a drawer.
 */
const MOBILE_BREAKPOINT = 768

/**
 * Whether the visitor is on a narrow screen, where the navigation does not
 * fit next to the content.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  )

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isMobile
}
