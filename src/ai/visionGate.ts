import type { ModelManager, Target } from '@/types/contracts'

export type VisionFn = (
  img: Blob,
  phrase: string,
  near?: [number, number]
) => Promise<Target | null>

export type VisionGateModels = Pick<ModelManager, 'status' | 'device' | 'warmUp'>

export interface GateVisionOptions {
  /** Max time to wait for the real vision call before falling back to null. */
  timeoutMs?: number
  /** Returns true when the user has requested reduced data usage. */
  saveData?: () => boolean
}

const DEFAULT_TIMEOUT_MS = 5000

/** Module flag: the background Florence warm-up is started at most once per session. */
let warmUpStarted = false

/** Test helper: resets the once-only warm-up flag. */
export function resetVisionGateForTests(): void {
  warmUpStarted = false
}

function defaultSaveData(): boolean {
  if (typeof navigator === 'undefined') return false
  const connection = (navigator as unknown as { connection?: { saveData?: boolean } }).connection
  return connection?.saveData === true
}

/**
 * Wraps a vision grounding function so it never blocks the engine on a model download.
 * - Florence not ready: returns null immediately and, on WebGPU without data saver,
 *   starts a one-time background warm-up.
 * - Florence ready: runs the inner call, returning null if it exceeds the timeout.
 */
export function gateVision(
  inner: VisionFn,
  models: VisionGateModels,
  opts: GateVisionOptions = {}
): VisionFn {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const saveData = opts.saveData ?? defaultSaveData

  return async (img, phrase, near) => {
    if (models.status().florence.status !== 'ready') {
      if (!warmUpStarted && models.device() === 'webgpu' && !saveData()) {
        warmUpStarted = true
        models.warmUp(['florence']).catch(() => {})
      }
      return null
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs)
    })
    try {
      return await Promise.race([inner(img, phrase, near).catch(() => null), timeout])
    } finally {
      clearTimeout(timer)
    }
  }
}
