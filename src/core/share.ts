import type { ShareService } from '@/types/contracts'

/**
 * Creates a Web Share API integration service for sharing screenshots and progress cards.
 */
export function createShare(): ShareService {
  return {
    async shareImage(blob: Blob, text: string): Promise<'shared' | 'unsupported' | 'cancelled'> {
      if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
        return 'unsupported'
      }

      const file = new File([blob], 'ishaara-share.png', {
        type: blob.type || 'image/png',
      })

      if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
        return 'unsupported'
      }

      try {
        await navigator.share({
          files: [file],
          text,
        })
        return 'shared'
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return 'cancelled'
        }
        return 'unsupported'
      }
    },
  }
}
