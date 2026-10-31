import * as Comlink from 'comlink'
import type { LoadProgress, ModelId, ModelManager } from '@/types/contracts'
import type { AiWorkerApi } from '@/workers/ai.worker'

export type AppModelManager = ModelManager & {
  worker: Comlink.Remote<AiWorkerApi>
  forwardProgress: (e: LoadProgress) => void
  terminate: () => void
}

/**
 * Creates the unified on-device AI model manager orchestrating Whisper,
 * Florence-2, Translation, TTS, and forwarding OCR progress.
 */
export function createModelManager(): AppModelManager {
  let worker: Worker | null = null
  let remote: Comlink.Remote<AiWorkerApi> | null = null
  const listeners = new Set<(e: LoadProgress) => void>()

  let currentDevice: 'webgpu' | 'wasm' = 'wasm'
  if (typeof navigator !== 'undefined') {
    const navGpu = (
      navigator as unknown as {
        gpu?: { requestAdapter: () => Promise<unknown> }
      }
    ).gpu
    if (navGpu && typeof navGpu.requestAdapter === 'function') {
      try {
        navGpu
          .requestAdapter()
          .then((adapter: unknown) => {
            if (adapter) currentDevice = 'webgpu'
          })
          .catch(() => {})
      } catch {
        // Keep wasm default
      }
    }
  }

  const statuses: Record<ModelId, LoadProgress> = {
    ocr: { model: 'ocr', status: 'idle', progress: 0 },
    whisper: { model: 'whisper', status: 'idle', progress: 0 },
    florence: { model: 'florence', status: 'idle', progress: 0 },
    translate: { model: 'translate', status: 'idle', progress: 0 },
    tts: { model: 'tts', status: 'idle', progress: 0 },
  }

  function notify(event: LoadProgress): void {
    statuses[event.model] = event
    for (const cb of listeners) {
      try {
        cb(event)
      } catch {
        // ignore subscriber exceptions
      }
    }
  }

  function getRemote(): Comlink.Remote<AiWorkerApi> {
    if (!remote) {
      if (typeof Worker === 'undefined') {
        remote = {
          setProgressCallback: () => {},
          getDevice: async () => 'wasm',
          transcribe: async () => '',
          ground: async () => ({ boxes: [], width: 0, height: 0 }),
          translate: async () => null,
          tts: async () => null,
          warmUpModel: async () => {},
        } as unknown as Comlink.Remote<AiWorkerApi>
        return remote
      }

      worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), {
        type: 'module',
      })
      remote = Comlink.wrap<AiWorkerApi>(worker)
      try {
        remote.setProgressCallback(
          Comlink.proxy((e: LoadProgress) => {
            notify(e)
          })
        )
        // Also probe device from worker
        remote
          .getDevice()
          .then((dev) => {
            currentDevice = dev
          })
          .catch(() => {})
      } catch {
        // Safe proxy setup
      }
    }
    return remote
  }

  return {
    get worker(): Comlink.Remote<AiWorkerApi> {
      return getRemote()
    },

    forwardProgress(e: LoadProgress): void {
      notify(e)
    },

    status(): Record<ModelId, LoadProgress> {
      return { ...statuses }
    },

    onProgress(cb: (e: LoadProgress) => void): () => void {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },

    device(): 'webgpu' | 'wasm' {
      return currentDevice
    },

    async warmUp(models: ModelId[]): Promise<void> {
      const r = getRemote()
      for (const m of models) {
        if (m === 'ocr') continue
        await r.warmUpModel(m)
      }
    },

    terminate(): void {
      if (worker) {
        worker.terminate()
        worker = null
        remote = null
      }
    },
  }
}
