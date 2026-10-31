import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { services } from '@/ui/services'

/**
 * Read once, when the module loads: the router drops ?from=shortcut when it redirects "/" to "/home",
 * so the flag has to be captured before any route renders.
 */
let pendingShortcut = services.capture.isShortcutLaunch()

/**
 * Opened by the Back-Tap Shortcut: go straight to the Dikhayein screen (Ask, photo, from=shortcut).
 * Runs at most once per app start.
 */
export function useShortcutLaunch(): void {
  const navigate = useNavigate()

  useEffect(() => {
    if (!pendingShortcut) return
    pendingShortcut = false
    navigate('/ask/photo?from=shortcut', { replace: true })
    // Hide the flag from the address bar; the router keeps its own copy for this screen.
    services.capture.consumeShortcutParam()
  }, [navigate])
}
