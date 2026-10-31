import type { CaptureService } from '@/types/contracts'

/**
 * Creates the screenshot capture and app return detection service.
 */
export function createCapture(): CaptureService {
  return {
    /**
     * Reads image from the clipboard. Must be invoked inside a user gesture.
     * Returns null on error, unsupported environment, or if no image is present. Never throws.
     */
    async readClipboardImage(): Promise<Blob | null> {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.read) {
        return null
      }

      try {
        const items = await navigator.clipboard.read()
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith('image/'))
          if (imageType) {
            return await item.getType(imageType)
          }
        }
        return null
      } catch {
        return null
      }
    },

    /**
     * True when the app was launched or opened via the Back-Tap Shortcut (?from=shortcut).
     */
    isShortcutLaunch(): boolean {
      if (typeof window === 'undefined') return false
      try {
        return new URLSearchParams(window.location.search).get('from') === 'shortcut'
      } catch {
        return false
      }
    },

    /**
     * True when the app was launched or opened via Android Web Share Target (?from=share).
     */
    isShareLaunch(): boolean {
      if (typeof window === 'undefined') return false
      try {
        return new URLSearchParams(window.location.search).get('from') === 'share'
      } catch {
        return false
      }
    },

    /**
     * Reads and deletes the latest shared image from cache storage 'ishaara-share'.
     * Returns null if absent, unsupported, or on error. Never throws.
     */
    async takeSharedImage(): Promise<Blob | null> {
      if (typeof caches === 'undefined' || !caches.open) {
        return null
      }
      try {
        const cache = await caches.open('ishaara-share')
        const response = await cache.match('/shared/latest')
        if (!response) {
          return null
        }
        const blob = await response.blob()
        await cache.delete('/shared/latest')
        return blob
      } catch {
        return null
      }
    },

    /**
     * Removes ?from=shortcut or ?from=share from the current URL via history.replaceState without reloading.
     */
    consumeShortcutParam(): void {
      if (typeof window === 'undefined') return
      if (!this.isShortcutLaunch() && !this.isShareLaunch()) return

      try {
        const url = new URL(window.location.href)
        url.searchParams.delete('from')
        const newUrl = url.pathname + (url.search ? url.search : '') + url.hash
        window.history.replaceState({}, '', newUrl || '/')
      } catch {
        // Safe fallback if history API is restricted
      }
    },

    /**
     * Subscribes to visibilitychange (visible) and window focus, debouncing by 300ms.
     * Returns an unsubscribe function.
     */
    onReturn(cb: () => void): () => void {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return () => {}
      }

      let timer: ReturnType<typeof setTimeout> | null = null

      const trigger = () => {
        if (timer !== null) {
          clearTimeout(timer)
        }
        timer = setTimeout(() => {
          timer = null
          cb()
        }, 300)
      }

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          trigger()
        }
      }

      const handleFocus = () => {
        trigger()
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('focus', handleFocus)

      return () => {
        if (timer !== null) {
          clearTimeout(timer)
          timer = null
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('focus', handleFocus)
      }
    },
  }
}
