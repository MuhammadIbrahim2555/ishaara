import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  expose: vi.fn(),
  pipeline: vi.fn(),
  florenceFrom: vi.fn(),
  processorFrom: vi.fn(),
  env: {} as Record<string, unknown>,
}))

vi.mock('comlink', () => ({
  expose: mocks.expose,
  wrap: vi.fn(),
  proxy: (x: unknown) => x,
}))

vi.mock('@huggingface/transformers', () => ({
  env: mocks.env,
  pipeline: mocks.pipeline,
  Florence2ForConditionalGeneration: { from_pretrained: mocks.florenceFrom },
  AutoProcessor: { from_pretrained: mocks.processorFrom },
  RawImage: { fromBlob: vi.fn() },
}))

interface WorkerApi {
  setProgressCallback(cb: (e: unknown) => void): void
  getDevice(): Promise<string>
  transcribe(pcm: Float32Array): Promise<string>
  translate(text: string): Promise<string | null>
  tts(text: string): Promise<{ audio: Float32Array; sampling_rate: number } | null>
  warmUpModel(model: string): Promise<void>
}

/** Imports a fresh worker module (fresh pipeline caches) and returns its exposed API. */
async function loadWorker(): Promise<WorkerApi> {
  vi.resetModules()
  mocks.expose.mockClear()
  await import('@/workers/ai.worker')
  return mocks.expose.mock.calls[0][0] as WorkerApi
}

function setWebGpu(available: boolean): void {
  Object.defineProperty(navigator, 'gpu', {
    value: available ? { requestAdapter: async () => ({}) } : undefined,
    configurable: true,
  })
}

describe('ai.worker model loading', () => {
  let progress: ReturnType<typeof vi.fn>
  let api: WorkerApi

  // The worker's startup self-heal calls caches.open('transformers-cache').
  // jsdom has no Cache Storage, so stub it for this file and restore it afterwards.
  const hadCaches = 'caches' in globalThis
  const originalCaches = (globalThis as unknown as { caches?: unknown }).caches

  beforeAll(() => {
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: {
        open: vi.fn(async () => ({
          keys: async () => [],
          match: async () => undefined,
          delete: async () => true,
        })),
      },
    })
  })

  afterAll(() => {
    if (hadCaches) {
      Object.defineProperty(globalThis, 'caches', { configurable: true, value: originalCaches })
    } else {
      delete (globalThis as unknown as { caches?: unknown }).caches
    }
  })

  beforeEach(async () => {
    mocks.pipeline.mockReset()
    mocks.florenceFrom.mockReset()
    mocks.processorFrom.mockReset()
    mocks.processorFrom.mockResolvedValue({})
    progress = vi.fn()
    api = await loadWorker()
    api.setProgressCallback(progress as unknown as (e: unknown) => void)
  })

  afterEach(() => {
    setWebGpu(false)
    delete (navigator as unknown as Record<string, unknown>).gpu
  })

  it('loads every model from the Hugging Face Hub with no self-hosted paths', () => {
    expect(mocks.env.allowLocalModels).toBe(false)
    expect(mocks.env.allowRemoteModels).toBe(true)
    expect(mocks.env).not.toHaveProperty('localModelPath')
  })

  describe('whisper', () => {
    it('loads whisper-base on WebGPU with per-component dtypes and transcribes Urdu', async () => {
      setWebGpu(true)
      const pipe = vi.fn(async () => ({ text: 'کیمرہ' }))
      mocks.pipeline.mockResolvedValueOnce(pipe)

      const text = await api.transcribe(new Float32Array(16000))

      expect(text).toBe('کیمرہ')
      expect(mocks.pipeline).toHaveBeenCalledTimes(1)
      expect(mocks.pipeline).toHaveBeenCalledWith(
        'automatic-speech-recognition',
        'onnx-community/whisper-base',
        expect.objectContaining({
          device: 'webgpu',
          dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
        })
      )
      // Short clip: no chunking option
      expect(pipe).toHaveBeenCalledWith(expect.any(Float32Array), {
        language: 'urdu',
        task: 'transcribe',
      })
    })

    it('adds chunk_length_s only for clips longer than 30 seconds', async () => {
      setWebGpu(true)
      const pipe = vi.fn(async () => ({ text: 'x' }))
      mocks.pipeline.mockResolvedValueOnce(pipe)

      await api.transcribe(new Float32Array(31 * 16000))

      expect(pipe).toHaveBeenCalledWith(expect.any(Float32Array), {
        language: 'urdu',
        task: 'transcribe',
        chunk_length_s: 30,
      })
    })

    it('falls back once to the WASM config (whisper-tiny q8) when the WebGPU load throws', async () => {
      setWebGpu(true)
      const pipe = vi.fn(async () => ({ text: 'ٹھیک' }))
      mocks.pipeline
        .mockRejectedValueOnce(new Error('webgpu failed'))
        .mockResolvedValueOnce(pipe)

      const text = await api.transcribe(new Float32Array(16000))

      expect(text).toBe('ٹھیک')
      expect(mocks.pipeline).toHaveBeenCalledTimes(2)
      expect(mocks.pipeline).toHaveBeenLastCalledWith(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny',
        expect.objectContaining({ device: 'wasm', dtype: 'q8' })
      )
    })

    it('emits an error status and returns empty text instead of swallowing the failure', async () => {
      setWebGpu(false)
      mocks.pipeline.mockRejectedValue(new Error('boom: model missing'))

      const text = await api.transcribe(new Float32Array(16000))

      expect(text).toBe('')
      expect(progress).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'whisper',
          status: 'error',
          message: expect.stringContaining('boom: model missing'),
        })
      )
    })
  })

  describe('florence', () => {
    const WEBGPU_DTYPE = {
      embed_tokens: 'fp16',
      vision_encoder: 'fp16',
      encoder_model: 'q4',
      decoder_model_merged: 'q4',
    }

    it('loads Florence-2 on WebGPU with the mixed fp16/q4 dtype map', async () => {
      setWebGpu(true)
      mocks.florenceFrom.mockResolvedValueOnce({})

      await api.warmUpModel('florence')

      expect(mocks.florenceFrom).toHaveBeenCalledTimes(1)
      expect(mocks.florenceFrom).toHaveBeenCalledWith(
        'onnx-community/Florence-2-base-ft',
        expect.objectContaining({ device: 'webgpu', dtype: WEBGPU_DTYPE })
      )
      expect(mocks.processorFrom).toHaveBeenCalledWith('onnx-community/Florence-2-base-ft')
    })

    it('makes exactly one fallback to WASM q8 and never tries fp32', async () => {
      setWebGpu(true)
      mocks.florenceFrom
        .mockRejectedValueOnce(new Error('webgpu oom'))
        .mockResolvedValueOnce({})

      await api.warmUpModel('florence')

      expect(mocks.florenceFrom).toHaveBeenCalledTimes(2)
      expect(mocks.florenceFrom).toHaveBeenLastCalledWith(
        'onnx-community/Florence-2-base-ft',
        expect.objectContaining({ device: 'wasm', dtype: 'q8' })
      )
      const allDtypes = mocks.florenceFrom.mock.calls.map(
        (c) => (c[1] as { dtype: unknown }).dtype
      )
      expect(JSON.stringify(allDtypes)).not.toContain('fp32')
    })

    it('uses WASM q8 directly when WebGPU is unavailable', async () => {
      setWebGpu(false)
      mocks.florenceFrom.mockResolvedValueOnce({})

      await api.warmUpModel('florence')

      expect(mocks.florenceFrom).toHaveBeenCalledTimes(1)
      expect(mocks.florenceFrom).toHaveBeenCalledWith(
        'onnx-community/Florence-2-base-ft',
        expect.objectContaining({ device: 'wasm', dtype: 'q8' })
      )
    })
  })

  describe('translate (Hub Opus-MT en-ur)', () => {
    it('loads fintutto/opus-mt-en-ur from the Hub as q8 on WASM and returns the translation', async () => {
      const pipe = vi.fn(async () => [{ translation_text: 'کیمرہ' }])
      mocks.pipeline.mockResolvedValueOnce(pipe)

      const out = await api.translate('Open the camera app')

      expect(out).toBe('کیمرہ')
      expect(mocks.pipeline).toHaveBeenCalledWith(
        'translation',
        'fintutto/opus-mt-en-ur',
        expect.objectContaining({ dtype: 'q8', device: 'wasm' })
      )
      const options = mocks.pipeline.mock.calls[0][2] as Record<string, unknown>
      expect(options).not.toHaveProperty('local_files_only')
      expect(progress).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'translate', status: 'ready', message: 'Opus-MT ready' })
      )
    })

    it('emits status error with the message and returns null when the model fails', async () => {
      mocks.pipeline.mockRejectedValue(new Error('model files missing'))

      const out = await api.translate('Open the camera app')

      expect(out).toBeNull()
      expect(progress).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'translate',
          status: 'error',
          message: expect.stringContaining('model files missing'),
        })
      )
    })
  })

  describe('tts (Hub MMS-TTS Urdu ONNX)', () => {
    it('loads obaidasiaone/mms-tts-urd-onnx from the Hub as fp32 on WASM and returns audio', async () => {
      const pipe = vi.fn(async () => ({ audio: new Float32Array(4), sampling_rate: 16000 }))
      mocks.pipeline.mockResolvedValueOnce(pipe)

      const out = await api.tts('کیمرہ')

      expect(out?.sampling_rate).toBe(16000)
      expect(out?.audio.length).toBe(4)
      expect(mocks.pipeline).toHaveBeenCalledWith(
        'text-to-speech',
        'obaidasiaone/mms-tts-urd-onnx',
        expect.objectContaining({ dtype: 'fp32', device: 'wasm' })
      )
      const options = mocks.pipeline.mock.calls[0][2] as Record<string, unknown>
      expect(options).not.toHaveProperty('local_files_only')
    })

    it('emits status error and returns null when the model cannot load', async () => {
      mocks.pipeline.mockRejectedValue(new Error('no tts files'))

      const out = await api.tts('کیمرہ')

      expect(out).toBeNull()
      expect(progress).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'tts',
          status: 'error',
          message: expect.stringContaining('no tts files'),
        })
      )
    })

    it('emits status error when the pipeline returns no audio', async () => {
      mocks.pipeline.mockResolvedValueOnce(vi.fn(async () => null))

      const out = await api.tts('کیمرہ')

      expect(out).toBeNull()
      expect(progress).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'tts', status: 'error' })
      )
    })
  })
})
