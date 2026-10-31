import * as Comlink from 'comlink'
import {
  env,
  pipeline,
  Florence2ForConditionalGeneration,
  AutoProcessor,
  RawImage,
} from '@huggingface/transformers'
import type { LoadProgress, ModelId } from '@/types/contracts'

env.allowLocalModels = false
env.useBrowserCache = true

type ProgressCallback = (progress: LoadProgress) => void
let progressSubscriber: ProgressCallback | null = null

function emitProgress(progress: LoadProgress): void {
  if (progressSubscriber) {
    try {
      progressSubscriber(progress)
    } catch {
      // Ignore callback dispatch failures across Comlink boundary
    }
  }
}

function makeProgressTracker(model: ModelId) {
  const fileMap = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (info: any) => {
    if (!info) return
    if (info.status === 'progress' && info.file) {
      const p =
        typeof info.progress === 'number'
          ? info.progress / 100
          : info.loaded && info.total
            ? info.loaded / info.total
            : 0
      fileMap.set(info.file, Math.min(1, Math.max(0, p)))
      let sum = 0
      for (const val of fileMap.values()) {
        sum += val
      }
      const avg = fileMap.size > 0 ? sum / fileMap.size : 0
      emitProgress({
        model,
        status: 'downloading',
        progress: Number(avg.toFixed(2)),
        message: `Downloading ${model} (${info.file})...`,
      })
    } else if (info.status === 'initiate' || info.status === 'download') {
      emitProgress({
        model,
        status: 'downloading',
        progress: 0.1,
        message: `Fetching ${model}...`,
      })
    }
  }
}

async function getDeviceAndDtype(): Promise<{
  device: 'webgpu' | 'wasm'
  dtype: 'fp16' | 'fp32' | 'q8'
}> {
  if (typeof navigator !== 'undefined') {
    const navGpu = (
      navigator as unknown as {
        gpu?: { requestAdapter: () => Promise<unknown> }
      }
    ).gpu
    if (navGpu && typeof navGpu.requestAdapter === 'function') {
      try {
        const adapter = await navGpu.requestAdapter()
        if (adapter) {
          return { device: 'webgpu', dtype: 'fp16' }
        }
      } catch {
        // Fallback to WASM
      }
    }
  }
  return { device: 'wasm', dtype: 'q8' }
}

const loadPipeline = pipeline as unknown as (
  task: string,
  model?: string,
  options?: Record<string, unknown>
) => Promise<unknown>

type WhisperPipeline = (
  input: Float32Array,
  options?: Record<string, unknown>
) => Promise<unknown>

interface FlorenceModel {
  generate(options: Record<string, unknown>): Promise<unknown>
}

interface FlorenceProcessor {
  (image: unknown, prompt: string): Promise<Record<string, unknown>>
  batch_decode(ids: unknown, options: { skip_special_tokens: boolean }): string[]
  post_process_generation(
    text: string,
    task: string,
    image_size: [number, number]
  ): Record<string, { bboxes?: [number, number, number, number][] }>
}

type TranslationPipeline = (text: string) => Promise<unknown>

type TtsPipeline = (
  text: string
) => Promise<{ audio?: Float32Array; sampling_rate?: number } | null>

// Pipelines and models cache
let whisperPipeline: WhisperPipeline | null = null
let florenceModel: FlorenceModel | null = null
let florenceProcessor: FlorenceProcessor | null = null
let translatePipeline: TranslationPipeline | null = null
let translatePermanentlyFailed = false
let ttsPipeline: TtsPipeline | null = null
let ttsPermanentlyFailed = false

async function getWhisper(): Promise<WhisperPipeline> {
  if (whisperPipeline) return whisperPipeline

  emitProgress({
    model: 'whisper',
    status: 'downloading',
    progress: 0.05,
    message: 'Loading Whisper ASR model...',
  })

  const { device, dtype } = await getDeviceAndDtype()
  const candidates = [
    'onnx-community/whisper-base',
    'onnx-community/whisper-tiny',
    'Xenova/whisper-tiny',
  ]
  let lastError: unknown = null

  for (const modelId of candidates) {
    try {
      const p = (await loadPipeline('automatic-speech-recognition', modelId, {
        device,
        dtype: dtype === 'fp16' ? 'fp16' : dtype === 'q8' ? 'q8' : 'fp32',
        progress_callback: makeProgressTracker('whisper'),
      })) as WhisperPipeline
      whisperPipeline = p
      emitProgress({
        model: 'whisper',
        status: 'ready',
        progress: 1.0,
        message: `Whisper ready (${modelId})`,
      })
      return whisperPipeline
    } catch (err) {
      lastError = err
      // Try next candidate
    }
  }

  emitProgress({
    model: 'whisper',
    status: 'error',
    progress: 0,
    message: lastError instanceof Error ? lastError.message : 'Failed to load Whisper model',
  })
  throw lastError ?? new Error('Failed to load Whisper ASR')
}

async function getFlorence(): Promise<{
  model: FlorenceModel
  processor: FlorenceProcessor
}> {
  if (florenceModel && florenceProcessor) {
    return { model: florenceModel, processor: florenceProcessor }
  }

  emitProgress({
    model: 'florence',
    status: 'downloading',
    progress: 0.05,
    message: 'Loading Florence-2 vision model...',
  })

  const { device, dtype } = await getDeviceAndDtype()
  const modelId = 'onnx-community/Florence-2-base-ft'

  try {
    florenceProcessor = (await AutoProcessor.from_pretrained(
      modelId
    )) as unknown as FlorenceProcessor
    try {
      florenceModel = (await Florence2ForConditionalGeneration.from_pretrained(
        modelId,
        {
          device,
          dtype: dtype === 'fp16' ? 'fp16' : dtype === 'q8' ? 'q8' : 'fp32',
          progress_callback: makeProgressTracker('florence'),
        }
      )) as unknown as FlorenceModel
    } catch (loadErr) {
      if (device === 'webgpu' && dtype === 'fp16') {
        // Fallback to fp32 or wasm
        try {
          florenceModel =
            (await Florence2ForConditionalGeneration.from_pretrained(modelId, {
              device: 'webgpu',
              dtype: 'fp32',
              progress_callback: makeProgressTracker('florence'),
            })) as unknown as FlorenceModel
        } catch {
          florenceModel =
            (await Florence2ForConditionalGeneration.from_pretrained(modelId, {
              device: 'wasm',
              dtype: 'q8',
              progress_callback: makeProgressTracker('florence'),
            })) as unknown as FlorenceModel
        }
      } else {
        throw loadErr
      }
    }

    emitProgress({
      model: 'florence',
      status: 'ready',
      progress: 1.0,
      message: 'Florence-2 ready',
    })
    return { model: florenceModel, processor: florenceProcessor }
  } catch (err) {
    emitProgress({
      model: 'florence',
      status: 'error',
      progress: 0,
      message: err instanceof Error ? err.message : 'Failed to load Florence-2',
    })
    throw err
  }
}

async function getTranslator(): Promise<TranslationPipeline | null> {
  if (translatePermanentlyFailed) return null
  if (translatePipeline) return translatePipeline

  emitProgress({
    model: 'translate',
    status: 'downloading',
    progress: 0.05,
    message: 'Loading translation model...',
  })

  try {
    translatePipeline = (await loadPipeline(
      'translation',
      'Xenova/opus-mt-en-ur',
      {
        progress_callback: makeProgressTracker('translate'),
      }
    )) as TranslationPipeline
    emitProgress({
      model: 'translate',
      status: 'ready',
      progress: 1.0,
      message: 'Translation model ready',
    })
    return translatePipeline
  } catch (err) {
    translatePermanentlyFailed = true
    emitProgress({
      model: 'translate',
      status: 'error',
      progress: 0,
      message:
        err instanceof Error ? err.message : 'Translation model unavailable',
    })
    return null
  }
}

async function getTts(): Promise<TtsPipeline | null> {
  if (ttsPermanentlyFailed) return null
  if (ttsPipeline) return ttsPipeline

  emitProgress({
    model: 'tts',
    status: 'downloading',
    progress: 0.05,
    message: 'Loading Urdu TTS model...',
  })

  const candidates = [
    'Xenova/mms-tts-urd',
    'onnx-community/mms-tts-urd',
    'Xenova/mms-tts-urd-script_arabic',
  ]

  for (const modelId of candidates) {
    try {
      ttsPipeline = (await loadPipeline('text-to-speech', modelId, {
        progress_callback: makeProgressTracker('tts'),
      })) as unknown as TtsPipeline
      emitProgress({
        model: 'tts',
        status: 'ready',
        progress: 1.0,
        message: `TTS ready (${modelId})`,
      })
      return ttsPipeline
    } catch {
      // Try next candidate
    }
  }

  ttsPermanentlyFailed = true
  emitProgress({
    model: 'tts',
    status: 'error',
    progress: 0,
    message: 'Urdu TTS model unavailable',
  })
  return null
}

const api = {
  setProgressCallback(cb: ProgressCallback): void {
    progressSubscriber = cb
  },

  async getDevice(): Promise<'webgpu' | 'wasm'> {
    const { device } = await getDeviceAndDtype()
    return device
  },

  async transcribe(pcm: Float32Array): Promise<string> {
    try {
      const whisper = await getWhisper()
      const output = (await whisper(pcm, {
        language: 'urdu',
        task: 'transcribe',
        chunk_length_s: 20,
      })) as Record<string, unknown> | string | undefined
      if (!output) return ''
      if (typeof output === 'string') return output
      if (typeof output.text === 'string') return output.text
      if (Array.isArray(output) && output[0]?.text) return String(output[0].text)
      return ''
    } catch {
      return ''
    }
  },

  async ground(
    image: Blob,
    phrase: string
  ): Promise<{ boxes: [number, number, number, number][]; width: number; height: number }> {
    try {
      const { model, processor } = await getFlorence()
      const rawImg = await RawImage.fromBlob(image)
      const task = '<CAPTION_TO_PHRASE_GROUNDING>'
      const prompt = `${task}${phrase}`

      const inputs = await processor(rawImg, prompt)
      const generatedIds = await model.generate({
        ...inputs,
        max_new_tokens: 1024,
      })
      const generatedText = processor.batch_decode(generatedIds, {
        skip_special_tokens: false,
      })[0]
      const parsed = processor.post_process_generation(generatedText, task, [
        rawImg.width,
        rawImg.height,
      ])
      const answer = parsed[task]
      const boxes: [number, number, number, number][] = answer?.bboxes ?? []

      return {
        boxes,
        width: rawImg.width,
        height: rawImg.height,
      }
    } catch {
      return {
        boxes: [],
        width: 0,
        height: 0,
      }
    }
  },

  async translate(text: string): Promise<string | null> {
    try {
      const translator = await getTranslator()
      if (!translator) return null
      const output = (await translator(text)) as
        | Record<string, unknown>
        | string
        | undefined
      if (!output) return null
      if (typeof output === 'string') return output
      if (typeof output.translation_text === 'string')
        return output.translation_text
      if (Array.isArray(output) && output[0]?.translation_text)
        return String(output[0].translation_text)
      return null
    } catch {
      return null
    }
  },

  async tts(text: string): Promise<{ audio: Float32Array; sampling_rate: number } | null> {
    try {
      const tts = await getTts()
      if (!tts) return null
      const output = await tts(text)
      if (!output || !output.audio) return null
      return {
        audio: output.audio as Float32Array,
        sampling_rate: (output.sampling_rate as number) || 16000,
      }
    } catch {
      return null
    }
  },

  async warmUpModel(model: ModelId): Promise<void> {
    try {
      switch (model) {
        case 'whisper':
          await getWhisper()
          break
        case 'florence':
          await getFlorence()
          break
        case 'translate':
          await getTranslator()
          break
        case 'tts':
          await getTts()
          break
        case 'ocr':
          // OCR is warmed up via its dedicated client
          break
      }
    } catch {
      // Warm up failure should not throw
    }
  },
}

Comlink.expose(api)

export type AiWorkerApi = typeof api
