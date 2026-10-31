import type {
  CaptureService,
  Engine,
  FamilyService,
  LearnEvent,
  LibraryService,
  LoadProgress,
  MetricsService,
  ModelId,
  ModelManager,
  ShareService,
  SpeechService,
  TranslateService,
  VoiceService,
} from '@/types/contracts'
import { createOcrClient } from '@/ai/ocr'
import { createModelManager } from '@/ai/models'
import { createSpeech } from '@/ai/speech'
import { createVision } from '@/ai/vision'
import { gateVision } from '@/ai/visionGate'
import { createVoice } from '@/ai/voice'
import { createTranslate } from '@/ai/translate'
import { createFamily, createMockFamily } from '@/sync/family'
import { SCREEN_MAPS } from '@/data/maps'
import { createCapture } from './capture'
import { createEngine } from './engine'
import { createLibrary } from './library'
import { createMockEngine, createMockSpeech } from './mockEngine'
import { createShare } from './share'
import { createMetrics } from './metrics'
import { renderProgressCard } from './progressCard'

export * from '@/types/contracts'
export { createEngine } from './engine'
export { createMockEngine, createMockSpeech } from './mockEngine'
export { createLibrary } from './library'
export { createShare } from './share'
export { createCapture } from './capture'
export { createSpeech } from '@/ai/speech'
export { createVision } from '@/ai/vision'
export { createVoice } from '@/ai/voice'
export { createTranslate } from '@/ai/translate'
export { createModelManager } from '@/ai/models'
export { createOcrClient } from '@/ai/ocr'
export { createMetrics } from './metrics'
export { renderProgressCard } from './progressCard'
export { SCREEN_MAPS } from '@/data/maps'
export { SAMPLE_SCREENS, loadSampleBlob } from '@/data/samples'
export { redactImage } from './image'

export interface AppServices {
  engine: Engine
  speech: SpeechService
  library: LibraryService
  share: ShareService
  voice: VoiceService
  translate: TranslateService
  capture: CaptureService
  models: ModelManager
  family: FamilyService
  metrics: MetricsService
  progressCard: typeof renderProgressCard
}

function createMockModelManager(): ModelManager {
  const listeners = new Set<(e: LoadProgress) => void>()
  const statuses: Record<ModelId, LoadProgress> = {
    ocr: { model: 'ocr', status: 'ready', progress: 1.0 },
    whisper: { model: 'whisper', status: 'ready', progress: 1.0 },
    florence: { model: 'florence', status: 'ready', progress: 1.0 },
    translate: { model: 'translate', status: 'ready', progress: 1.0 },
    tts: { model: 'tts', status: 'ready', progress: 1.0 },
  }

  function emit(e: LoadProgress) {
    statuses[e.model] = e
    for (const cb of listeners) {
      try {
        cb(e)
      } catch {
        // ignore
      }
    }
  }

  return {
    async warmUp(models: ModelId[]): Promise<void> {
      for (const m of models) {
        emit({
          model: m,
          status: 'downloading',
          progress: 0.5,
          message: `Mock loading ${m}...`,
        })
        emit({ model: m, status: 'ready', progress: 1.0, message: `Mock ${m} ready` })
      }
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
      return 'wasm'
    },
  }
}

/**
 * Initializes and wires the app services for UI consumption.
 * Supports running in mock mode for development or real mode with on-device AI.
 */
export function getServices({ mock }: { mock: boolean }): AppServices {
  const rawLibrary = createLibrary()
  const share = createShare()
  const capture = createCapture()
  const metrics = createMetrics()
  const family: FamilyService = mock ? createMockFamily() : createFamily()

  const library: LibraryService = {
    ...rawLibrary,
    async logEvent(e: LearnEvent): Promise<void> {
      await rawLibrary.logEvent(e)
      rawLibrary
        .progress()
        .then((summary) => family.pushProgress(summary))
        .catch(() => {})
    },
  }

  if (mock) {
    const rawEngine = createMockEngine()
    const engine: Engine = {
      ...rawEngine,
      analyze: (input) => metrics.time('analyze', () => rawEngine.analyze(input)),
      check: (input) => metrics.time('check', () => rawEngine.check(input)),
    }

    const rawSpeech = createMockSpeech()
    const speech: SpeechService = {
      transcribe: (audio) => metrics.time('whisper', () => rawSpeech.transcribe(audio)),
    }

    const models = createMockModelManager()

    const rawVoice = createVoice()
    const voice: VoiceService = {
      ...rawVoice,
      speak: (text, opts) => metrics.time('tts', () => rawVoice.speak(text, opts)),
    }

    const rawTranslate = createTranslate({
      worker: {
        translate: async () => null,
      },
    })
    const translate: TranslateService = {
      toUrdu: (text) => metrics.time('translate', () => rawTranslate.toUrdu(text)),
    }

    return {
      engine,
      speech,
      library,
      share,
      voice,
      translate,
      capture,
      models,
      family,
      metrics,
      progressCard: renderProgressCard,
    }
  }

  const models = createModelManager()
  const ocrClient = createOcrClient((progress) => {
    models.forwardProgress(progress)
  })

  const rawVision = createVision(models)
  const vision = gateVision(
    (img: Blob, phrase: string, near?: [number, number]) =>
      metrics.time('vision', () => rawVision(img, phrase, near)),
    models
  )

  const rawEngine = createEngine({
    ocr: (img) => metrics.time('ocr', () => ocrClient.recognize(img)),
    library,
    maps: SCREEN_MAPS,
    vision,
  })

  const engine: Engine = {
    ...rawEngine,
    analyze: (input) => metrics.time('analyze', () => rawEngine.analyze(input)),
    check: (input) => metrics.time('check', () => rawEngine.check(input)),
  }

  const rawSpeech = createSpeech(models)
  const speech: SpeechService = {
    transcribe: (audio) => metrics.time('whisper', () => rawSpeech.transcribe(audio)),
  }

  const rawVoice = createVoice(models)
  const voice: VoiceService = {
    ...rawVoice,
    speak: (text, opts) => metrics.time('tts', () => rawVoice.speak(text, opts)),
  }

  const rawTranslate = createTranslate(models)
  const translate: TranslateService = {
    toUrdu: (text) => metrics.time('translate', () => rawTranslate.toUrdu(text)),
  }

  return {
    engine,
    speech,
    library,
    share,
    voice,
    translate,
    capture,
    models,
    family,
    metrics,
    progressCard: renderProgressCard,
  }
}
