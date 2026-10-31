import * as Comlink from 'comlink'
import {
  env,
  pipeline,
  Florence2ForConditionalGeneration,
  AutoProcessor,
  RawImage,
} from '@huggingface/transformers'
import type { LoadProgress, ModelId } from '@/types/contracts'

// Local, self-hosted models live under public/models/ and are served from /models/.
// Whisper and Florence-2 still come from the Hugging Face Hub, so remote stays on.
env.allowLocalModels = false
env.allowRemoteModels = true
env.useBrowserCache = true

// Self-heal: drop cached "model files" that are really HTML pages (an SPA fallback cached
// by an older build), otherwise ONNX Runtime fails with "protobuf parsing failed" forever.
void (async () => {
  try {
    const cache = await caches.open('transformers-cache')
    for (const req of await cache.keys()) {
      const res = await cache.match(req)
      if (res?.headers.get('content-type')?.includes('text/html')) await cache.delete(req)
    }
  } catch {
    // Cache Storage unavailable: nothing to clean.
  }
})()

type ProgressCallback = (progress: LoadProgress) => void
let progressSubscriber: ProgressCallback | null = null

type Device = 'webgpu' | 'wasm'

function emitProgress(progress: LoadProgress): void {
  if (progressSubscriber) {
    try {
      progressSubscriber(progress)
    } catch {
      // Ignore callback dispatch failures across Comlink boundary
    }
  }
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string' && err) return err
  return fallback
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

/** WebGPU when an adapter can be requested, otherwise WASM. */
async function detectDevice(): Promise<Device> {
  if (typeof navigator !== 'undefined') {
    const navGpu = (
      navigator as unknown as {
        gpu?: { requestAdapter: () => Promise<unknown> }
      }
    ).gpu
    if (navGpu && typeof navGpu.requestAdapter === 'function') {
      try {
        const adapter = await navGpu.requestAdapter()
        if (adapter) return 'webgpu'
      } catch {
        // No usable adapter: use WASM
      }
    }
  }
  return 'wasm'
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

type FlorenceOptions = NonNullable<
  Parameters<typeof Florence2ForConditionalGeneration.from_pretrained>[1]
>

// ---- Whisper load plans -------------------------------------------------

interface WhisperAttempt {
  modelId: string
  dtype: unknown
}

interface WhisperPlan {
  device: Device
  attempts: WhisperAttempt[]
}

/** WebGPU: fp32 encoder + q4 decoder, the combination used by transformers.js browser demos. */
const WHISPER_WEBGPU: WhisperPlan = {
  device: 'webgpu',
  attempts: [
    {
      modelId: 'onnx-community/whisper-base',
      dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
    },
  ],
}

/** WASM: quantised tiny model, with a second repo id as fallback. */
const WHISPER_WASM: WhisperPlan = {
  device: 'wasm',
  attempts: [
    { modelId: 'onnx-community/whisper-tiny', dtype: 'q8' },
    { modelId: 'Xenova/whisper-tiny', dtype: 'q8' },
  ],
}

const WHISPER_CHUNK_SECONDS = 30
const SAMPLE_RATE = 16000

// ---- Florence-2 load plans ----------------------------------------------

const FLORENCE_MODEL_ID = 'onnx-community/Florence-2-base-ft'

/** WebGPU: fp16 vision/embeddings, q4 encoder/decoder. */
const FLORENCE_WEBGPU = {
  device: 'webgpu' as Device,
  dtype: {
    embed_tokens: 'fp16',
    vision_encoder: 'fp16',
    encoder_model: 'q4',
    decoder_model_merged: 'q4',
  },
}

/** WASM: q8 for all components. */
const FLORENCE_WASM = {
  device: 'wasm' as Device,
  dtype: 'q8',
}

// ---- Local models (self-hosted under public/models/) ---------------------

/** Opus-MT English -> Urdu (Helsinki-NLP), ONNX conversion hosted on the Hub. Apache-2.0. */
const TRANSLATE_MODEL_ID = 'fintutto/opus-mt-en-ur'
/** Meta MMS-TTS Urdu (facebook/mms-tts-urd-script_arabic), ONNX conversion on the Hub. CC-BY-NC-4.0. */
const TTS_MODEL_ID = 'obaidasiaone/mms-tts-urd-onnx'

const TRANSLATE_OPTIONS = { dtype: 'q8', device: 'wasm' }
// Only a full-precision model.onnx is published for this repo.
const TTS_OPTIONS = { dtype: 'fp32', device: 'wasm' }

// ---- Cached pipelines and in-flight loads --------------------------------

let whisperPipeline: WhisperPipeline | null = null
let whisperLoading: Promise<WhisperPipeline> | null = null
let florenceModel: FlorenceModel | null = null
let florenceProcessor: FlorenceProcessor | null = null
let florenceLoading: Promise<{
  model: FlorenceModel
  processor: FlorenceProcessor
}> | null = null
let translatePipeline: TranslationPipeline | null = null
let translateLoading: Promise<TranslationPipeline> | null = null
let ttsPipeline: TtsPipeline | null = null
let ttsLoading: Promise<TtsPipeline> | null = null

async function loadWhisperPlan(
  plan: WhisperPlan
): Promise<{ pipe: WhisperPipeline; modelId: string }> {
  let lastError: unknown = null
  for (const attempt of plan.attempts) {
    try {
      const pipe = (await loadPipeline('automatic-speech-recognition', attempt.modelId, {
        device: plan.device,
        dtype: attempt.dtype,
        progress_callback: makeProgressTracker('whisper'),
      })) as WhisperPipeline
      return { pipe, modelId: attempt.modelId }
    } catch (err) {
      lastError = err
    }
  }
  throw lastError ?? new Error('Failed to load Whisper ASR')
}

async function getWhisper(): Promise<WhisperPipeline> {
  if (whisperPipeline) return whisperPipeline
  if (whisperLoading) return whisperLoading

  whisperLoading = (async () => {
    emitProgress({
      model: 'whisper',
      status: 'downloading',
      progress: 0.05,
      message: 'Loading Whisper ASR model...',
    })
    try {
      const device = await detectDevice()
      let loaded: { pipe: WhisperPipeline; modelId: string }
      if (device === 'webgpu') {
        try {
          loaded = await loadWhisperPlan(WHISPER_WEBGPU)
        } catch {
          // Single fallback: WebGPU config failed, use the WASM config once
          loaded = await loadWhisperPlan(WHISPER_WASM)
        }
      } else {
        loaded = await loadWhisperPlan(WHISPER_WASM)
      }
      whisperPipeline = loaded.pipe
      emitProgress({
        model: 'whisper',
        status: 'ready',
        progress: 1.0,
        message: `Whisper ready (${loaded.modelId})`,
      })
      return loaded.pipe
    } catch (err) {
      const message = errorMessage(err, 'Failed to load Whisper model')
      emitProgress({ model: 'whisper', status: 'error', progress: 0, message })
      throw err
    } finally {
      whisperLoading = null
    }
  })()

  return whisperLoading
}

async function loadFlorenceModel(config: {
  device: Device
  dtype: unknown
}): Promise<FlorenceModel> {
  const options = {
    device: config.device,
    dtype: config.dtype,
    progress_callback: makeProgressTracker('florence'),
  } as unknown as FlorenceOptions
  return (await Florence2ForConditionalGeneration.from_pretrained(
    FLORENCE_MODEL_ID,
    options
  )) as unknown as FlorenceModel
}

async function getFlorence(): Promise<{
  model: FlorenceModel
  processor: FlorenceProcessor
}> {
  if (florenceModel && florenceProcessor) {
    return { model: florenceModel, processor: florenceProcessor }
  }
  if (florenceLoading) return florenceLoading

  florenceLoading = (async () => {
    emitProgress({
      model: 'florence',
      status: 'downloading',
      progress: 0.05,
      message: 'Loading Florence-2 vision model...',
    })
    try {
      const device = await detectDevice()
      const processor =
        florenceProcessor ??
        ((await AutoProcessor.from_pretrained(
          FLORENCE_MODEL_ID
        )) as unknown as FlorenceProcessor)

      let model: FlorenceModel
      if (device === 'webgpu') {
        try {
          model = await loadFlorenceModel(FLORENCE_WEBGPU)
        } catch {
          // Single fallback: WebGPU config failed, use the WASM config once
          model = await loadFlorenceModel(FLORENCE_WASM)
        }
      } else {
        model = await loadFlorenceModel(FLORENCE_WASM)
      }

      florenceProcessor = processor
      florenceModel = model
      emitProgress({
        model: 'florence',
        status: 'ready',
        progress: 1.0,
        message: 'Florence-2 ready',
      })
      return { model, processor }
    } catch (err) {
      const message = errorMessage(err, 'Failed to load Florence-2')
      emitProgress({ model: 'florence', status: 'error', progress: 0, message })
      throw err
    } finally {
      florenceLoading = null
    }
  })()

  return florenceLoading
}

async function getTranslator(): Promise<TranslationPipeline> {
  if (translatePipeline) return translatePipeline
  if (translateLoading) return translateLoading

  translateLoading = (async () => {
    emitProgress({
      model: 'translate',
      status: 'downloading',
      progress: 0.05,
      message: 'Loading translation model...',
    })
    try {
      const pipe = (await loadPipeline('translation', TRANSLATE_MODEL_ID, {
        ...TRANSLATE_OPTIONS,
        progress_callback: makeProgressTracker('translate'),
      })) as TranslationPipeline
      translatePipeline = pipe
      emitProgress({
        model: 'translate',
        status: 'ready',
        progress: 1.0,
        message: 'Opus-MT ready',
      })
      return pipe
    } catch (err) {
      const message = errorMessage(err, 'Translation model failed to load')
      emitProgress({ model: 'translate', status: 'error', progress: 0, message })
      throw err
    } finally {
      translateLoading = null
    }
  })()

  return translateLoading
}

async function getTts(): Promise<TtsPipeline> {
  if (ttsPipeline) return ttsPipeline
  if (ttsLoading) return ttsLoading

  ttsLoading = (async () => {
    emitProgress({
      model: 'tts',
      status: 'downloading',
      progress: 0.05,
      message: 'Loading Urdu TTS model...',
    })
    try {
      const pipe = (await loadPipeline('text-to-speech', TTS_MODEL_ID, {
        ...TTS_OPTIONS,
        progress_callback: makeProgressTracker('tts'),
      })) as TtsPipeline
      ttsPipeline = pipe
      emitProgress({
        model: 'tts',
        status: 'ready',
        progress: 1.0,
        message: 'MMS-TTS Urdu ready',
      })
      return pipe
    } catch (err) {
      const message = errorMessage(err, 'Urdu TTS model failed to load')
      emitProgress({ model: 'tts', status: 'error', progress: 0, message })
      throw err
    } finally {
      ttsLoading = null
    }
  })()

  return ttsLoading
}

function extractText(output: unknown): string {
  if (!output) return ''
  if (typeof output === 'string') return output
  if (Array.isArray(output)) {
    const first = output[0] as { text?: unknown } | undefined
    return typeof first?.text === 'string' ? first.text : ''
  }
  const withText = output as { text?: unknown }
  return typeof withText.text === 'string' ? withText.text : ''
}

function extractTranslation(output: unknown): string | null {
  if (!output) return null
  if (typeof output === 'string') return output
  if (Array.isArray(output)) {
    const first = output[0] as { translation_text?: unknown } | undefined
    return typeof first?.translation_text === 'string' ? first.translation_text : null
  }
  const withText = output as { translation_text?: unknown }
  return typeof withText.translation_text === 'string' ? withText.translation_text : null
}

const api = {
  setProgressCallback(cb: ProgressCallback): void {
    progressSubscriber = cb
  },

  async getDevice(): Promise<Device> {
    return detectDevice()
  },

  async transcribe(pcm: Float32Array): Promise<string> {
    try {
      const whisper = await getWhisper()
      const options: Record<string, unknown> = {
        language: 'urdu',
        task: 'transcribe',
      }
      // Whisper processes 30 s windows; only chunk longer clips.
      if (pcm.length > WHISPER_CHUNK_SECONDS * SAMPLE_RATE) {
        options.chunk_length_s = WHISPER_CHUNK_SECONDS
      }
      const output = await whisper(pcm, options)
      return extractText(output)
    } catch (err) {
      emitProgress({
        model: 'whisper',
        status: 'error',
        progress: 0,
        message: errorMessage(err, 'Whisper transcription failed'),
      })
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
    } catch (err) {
      emitProgress({
        model: 'florence',
        status: 'error',
        progress: 0,
        message: errorMessage(err, 'Florence-2 grounding failed'),
      })
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
      const output = await translator(text)
      return extractTranslation(output)
    } catch (err) {
      emitProgress({
        model: 'translate',
        status: 'error',
        progress: 0,
        message: errorMessage(err, 'Translation failed'),
      })
      return null
    }
  },

  async tts(text: string): Promise<{ audio: Float32Array; sampling_rate: number } | null> {
    try {
      const tts = await getTts()
      const output = await tts(text)
      if (!output || !output.audio) {
        throw new Error('TTS produced no audio')
      }
      return {
        audio: output.audio as Float32Array,
        sampling_rate: (output.sampling_rate as number) || 16000,
      }
    } catch (err) {
      emitProgress({
        model: 'tts',
        status: 'error',
        progress: 0,
        message: errorMessage(err, 'Urdu TTS failed'),
      })
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
      // Load failures are already emitted as status 'error'
    }
  },
}

Comlink.expose(api)

export type AiWorkerApi = typeof api
