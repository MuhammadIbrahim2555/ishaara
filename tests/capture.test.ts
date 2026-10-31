import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCapture } from '@/core/capture'

describe('createCapture', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
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
