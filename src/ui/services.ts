import { getServices, type AppServices } from '@/core'

// All UI code reaches engine, speech, library and share only through this file.
// Mock mode: add ?mock to the URL or set VITE_MOCK=1 (no on-device OCR download).
const useMock =
  new URLSearchParams(globalThis.location?.search ?? '').has('mock') ||
  import.meta.env.VITE_MOCK === '1'

export const services: AppServices = getServices({ mock: useMock })
