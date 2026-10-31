import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { services } from '@/ui/services'

/**
 * Read once, when the module loads: the router drops ?from=... when it redirects "/" to "/home",
 * so the launch source has to be captured before any route renders.
 */
let pendingLaunch: 'shortcut' | 'share' | null = services.capture.isShareLaunch()
  ? 'share'
  : services.capture.isShortcutLaunch()
    ? 'shortcut'
    : null

/**
 * Opened by the Back-Tap Shortcut (from=shortcut) or by Android Share (from=share): go straight to
 * the Ask photo screen with the same flag. Runs at most once per app start.
 */
export function useShortcutLaunch(): void {
  const navigate = useNavigate()

  useEffect(() => {
    if (!pendingLaunch) return
    const from = pendingLaunch
    pendingLaunch = null
    navigate(`/ask/photo?from=${from}`, { replace: true })
    // A Shortcut launch hides its flag here. A share launch keeps it until Ask takes the shared image.
    if (from === 'shortcut') services.capture.consumeShortcutParam()
  }, [navigate])
}
