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
