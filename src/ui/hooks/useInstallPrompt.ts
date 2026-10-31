import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallPrompt {
  /** True only when the browser has offered an install (beforeinstallprompt fired). */
  canInstall: boolean
  /** Opens the browser install dialog. Does nothing when no offer was captured. */
  install: () => Promise<void>
}

/**
 * Captured at module load, so an offer that fires before Setup mounts is not lost.
 * Chrome on Android fires beforeinstallprompt once; the event can be used only once.
 */
let captured: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notifyAll(): void {
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    captured = event as BeforeInstallPromptEvent
    notifyAll()
  })
}

/** Install offer from the browser, if one was captured. */
export function useInstallPrompt(): InstallPrompt {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const refresh = () => setVersion((n) => n + 1)
    listeners.add(refresh)
    return () => {
      listeners.delete(refresh)
    }
  }, [])

  return {
    canInstall: captured !== null,
    install: async () => {
      const event = captured
      if (!event) return
      captured = null
      notifyAll()
      try {
        await event.prompt()
        await event.userChoice
      } catch {
        // The prompt can only be shown once and may be refused by the browser. Nothing else to do.
      }
    },
  }
}
