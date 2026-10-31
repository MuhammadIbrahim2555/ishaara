import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCapture } from '@/core/capture'

describe('createCapture', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('reads first image blob from navigator.clipboard', async () => {
    const dummyBlob = new Blob(['image-content'], { type: 'image/png' })
    const mockItem = {
      types: ['text/plain', 'image/png'],
      getType: vi.fn(async (type: string) => {
        if (type === 'image/png') return dummyBlob
        throw new Error('Not found')
      }),
    }

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        read: vi.fn(async () => [mockItem]),
      },
      configurable: true,
      writable: true,
    })

    const capture = createCapture()
    const result = await capture.readClipboardImage()
    expect(result).toBe(dummyBlob)
  })

  it('returns null when clipboard has no image or read fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        read: vi.fn(async () => {
          throw new Error('Permission denied')
        }),
      },
      configurable: true,
      writable: true,
    })

    const capture = createCapture()
    const result = await capture.readClipboardImage()
    expect(result).toBeNull()
  })

  it('detects and consumes ?from=shortcut param via history.replaceState', () => {
    window.history.pushState({}, '', '/app?from=shortcut&task=photo')

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    const capture = createCapture()

    expect(capture.isShortcutLaunch()).toBe(true)

    capture.consumeShortcutParam()
    expect(replaceStateSpy).toHaveBeenCalledWith(
      {},
      '',
      '/app?task=photo'
    )
  })

  it('detects and consumes ?from=share param via history.replaceState', () => {
    window.history.pushState({}, '', '/ask/photo?from=share')

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
    const capture = createCapture()

    expect(capture.isShareLaunch()).toBe(true)
    expect(capture.isShortcutLaunch()).toBe(false)

    capture.consumeShortcutParam()
    expect(replaceStateSpy).toHaveBeenCalledWith({}, '', '/ask/photo')
  })

  it('returns null for takeSharedImage when caches API is absent or unsupported', async () => {
    const originalCaches = (globalThis as unknown as { caches?: unknown }).caches
    delete (globalThis as unknown as { caches?: unknown }).caches

    try {
      const capture = createCapture()
      const result = await capture.takeSharedImage()
      expect(result).toBeNull()
    } finally {
      if (originalCaches !== undefined) {
        ;(globalThis as unknown as { caches?: unknown }).caches = originalCaches
      }
    }
  })

  it('returns null for takeSharedImage when /shared/latest is absent in cache', async () => {
    const mockCache = {
      match: vi.fn(async (key: string) => {
        if (key === '/shared/latest') return undefined
        return undefined
      }),
      delete: vi.fn(async () => true),
    }

    vi.stubGlobal('caches', {
      open: vi.fn(async (name: string) => {
        if (name === 'ishaara-share') return mockCache
        throw new Error('Unknown cache')
      }),
    })

    const capture = createCapture()
    const result = await capture.takeSharedImage()
    expect(result).toBeNull()
    expect(mockCache.match).toHaveBeenCalledWith('/shared/latest')
    expect(mockCache.delete).not.toHaveBeenCalled()
  })

  it('reads and deletes /shared/latest from ishaara-share cache on takeSharedImage', async () => {
    const sharedBlob = new Blob(['shared-image-data'], { type: 'image/png' })
    const mockResponse = {
      blob: vi.fn(async () => sharedBlob),
    }

    let cacheHasEntry = true
    const mockCache = {
      match: vi.fn(async (key: string) => {
        if (key === '/shared/latest' && cacheHasEntry) {
          return mockResponse
        }
        return undefined
      }),
      delete: vi.fn(async (key: string) => {
        if (key === '/shared/latest') {
          cacheHasEntry = false
          return true
        }
        return false
      }),
    }

    vi.stubGlobal('caches', {
      open: vi.fn(async (name: string) => {
        if (name === 'ishaara-share') return mockCache
        throw new Error('Unknown cache')
      }),
    })

    const capture = createCapture()
    const result = await capture.takeSharedImage()
    expect(result).toBe(sharedBlob)
    expect(mockResponse.blob).toHaveBeenCalledTimes(1)
    expect(mockCache.delete).toHaveBeenCalledWith('/shared/latest')

    // Verify entry is deleted after read
    const secondResult = await capture.takeSharedImage()
    expect(secondResult).toBeNull()
  })

  it('debounces onReturn callback across visibilitychange and focus events', () => {
    const capture = createCapture()
    const callback = vi.fn()

    const unsubscribe = capture.onReturn(callback)

    // Trigger visibility change to visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))

    // Rapidly trigger window focus
    window.dispatchEvent(new Event('focus'))

    expect(callback).not.toHaveBeenCalled()

    // Advance debounce timer 300ms
    vi.advanceTimersByTime(300)
    expect(callback).toHaveBeenCalledTimes(1)

    unsubscribe()
  })
})
