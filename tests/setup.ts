import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

if (typeof globalThis.createImageBitmap === 'undefined') {
  globalThis.createImageBitmap = async (_image: ImageBitmapSource): Promise<ImageBitmap> => {
    return {
      width: 390,
      height: 844,
      close() {},
    } as unknown as ImageBitmap
  }
}

if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.clear !== 'function') {
  let store: Record<string, string> = {}
  const mockStorage: Storage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true,
  })
}
