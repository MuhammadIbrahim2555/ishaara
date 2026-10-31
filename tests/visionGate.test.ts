import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LoadProgress, ModelId, Target } from '@/types/contracts'
import { gateVision, resetVisionGateForTests, type VisionGateModels } from '@/ai/visionGate'

const TARGET: Target = {
  box: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
  source: 'vision',
  confidence: 0.8,
  label: 'search',
}

function fakeModels(opts: {
  florence: LoadProgress['status']
  device?: 'webgpu' | 'wasm'
}): VisionGateModels & { warmUp: ReturnType<typeof vi.fn> } {
  const statuses = {
    ocr: { model: 'ocr', status: 'ready', progress: 1 },
    whisper: { model: 'whisper', status: 'ready', progress: 1 },
    florence: { model: 'florence', status: opts.florence, progress: 0 },
    translate: { model: 'translate', status: 'ready', progress: 1 },
    tts: { model: 'tts', status: 'ready', progress: 1 },
  } as Record<ModelId, LoadProgress>
  return {
    status: () => statuses,
    device: () => opts.device ?? 'webgpu',
    warmUp: vi.fn(async () => {}),
    onProgress: () => () => {},
  } as VisionGateModels & { warmUp: ReturnType<typeof vi.fn> }
}

const blob = new Blob(['x'])

describe('gateVision', () => {
  beforeEach(() => {
    resetVisionGateForTests()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null without calling inner and starts warm-up once when not ready on webgpu', async () => {
    const inner = vi.fn(async () => TARGET)
    const models = fakeModels({ florence: 'downloading', device: 'webgpu' })
    const gated = gateVision(inner, models, { saveData: () => false })

    expect(await gated(blob, 'search')).toBeNull()
    expect(await gated(blob, 'search')).toBeNull()

    expect(inner).not.toHaveBeenCalled()
    expect(models.warmUp).toHaveBeenCalledTimes(1)
    expect(models.warmUp).toHaveBeenCalledWith(['florence'])
  })

  it('does not warm up on wasm or when data saver is on', async () => {
    const models = fakeModels({ florence: 'idle', device: 'wasm' })
    const gated = gateVision(async () => TARGET, models, { saveData: () => false })
    expect(await gated(blob, 'search')).toBeNull()
    expect(models.warmUp).not.toHaveBeenCalled()

    const saver = fakeModels({ florence: 'idle', device: 'webgpu' })
    const gatedSaver = gateVision(async () => TARGET, saver, { saveData: () => true })
    expect(await gatedSaver(blob, 'search')).toBeNull()
    expect(saver.warmUp).not.toHaveBeenCalled()
  })

  it('returns the inner result when florence is ready', async () => {
    const inner = vi.fn(async () => TARGET)
    const gated = gateVision(inner, fakeModels({ florence: 'ready' }), {
      saveData: () => false,
    })

    expect(await gated(blob, 'search', [0.2, 0.2])).toEqual(TARGET)
    expect(inner).toHaveBeenCalledWith(blob, 'search', [0.2, 0.2])
  })

  it('returns null when the inner call exceeds the timeout', async () => {
    vi.useFakeTimers()
    const inner = vi.fn(
      () => new Promise<Target | null>((resolve) => setTimeout(() => resolve(TARGET), 10_000))
    )
    const gated = gateVision(inner, fakeModels({ florence: 'ready' }), {
      timeoutMs: 5000,
      saveData: () => false,
    })

    const pending = gated(blob, 'search')
    await vi.advanceTimersByTimeAsync(5000)
    expect(await pending).toBeNull()
  })

  it('returns null when the inner call rejects', async () => {
    const gated = gateVision(
      async () => {
        throw new Error('boom')
      },
      fakeModels({ florence: 'ready' }),
      { saveData: () => false }
    )
    expect(await gated(blob, 'search')).toBeNull()
  })
})
