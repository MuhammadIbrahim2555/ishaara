import type {
  AnalyzeResult,
  CheckResult,
  Engine,
  Lesson,
  LoadProgress,
  ModelId,
  RedactRect,
  SpeechResult,
  SpeechService,
  TaskId,
} from '@/types/contracts'
import { newId } from './id'

/**
 * Creates a mock speech service returning predefined Urdu audio transcription and replies.
 */
export function createMockSpeech(): SpeechService {
  let online = true
  return {
    async transcribe(
      _audio: Blob,
    ): Promise<SpeechResult> {
      return {
        text: 'تصویر کیسے بھیجوں',
        task: 'photo',
        confidence: 0.9,
        replyUr: 'ٹھیک ہے، میں آپ کو تصویر بھیجنا سکھاتی ہوں',
        replyEn: "Okay, I'll teach you how to send a photo",
        source: 'gemini',
      }
    },
    mode: () => (online ? 'gemini' : 'whisper'),
    setOnline: (enabled: boolean) => {
      online = enabled
    },
  }
}

/**
 * Creates a mock Engine for the UI team that simulates lesson generation and verification
 * without requiring real OCR or on-device model weights.
 */
export function createMockEngine(): Engine {
  let checkCount = 0
  let currentLesson: Lesson | null = null
  const listeners: Set<(e: LoadProgress) => void> = new Set()

  function emit(e: LoadProgress): void {
    for (const cb of listeners) {
      try {
        cb(e)
      } catch {
        // ignore subscriber exceptions
      }
    }
  }

  function simulateModelLoading(): void {
    const models: ModelId[] = ['ocr', 'whisper', 'florence', 'translate']
    models.forEach((model, idx) => {
      setTimeout(() => {
        emit({
          model,
          status: 'downloading',
          progress: 0.3,
          message: `Downloading ${model} model...`,
        })
      }, idx * 300)

      setTimeout(
        () => {
          emit({
            model,
            status: 'ready',
            progress: 1.0,
            message: `${model} model ready`,
          })
        },
        idx * 300 + 800,
      )
    })
  }

  return {
    async analyze(input: {
      image: Blob
      task: TaskId
      redactions: RedactRect[]
      lessonId?: string
    }): Promise<AnalyzeResult> {
      // 800 ms delay to simulate processing
      await new Promise((resolve) => setTimeout(resolve, 800))

      const now = Date.now()
      const lesson: Lesson = {
        id: input.lessonId ?? newId(),
        task: 'photo',
        app: 'whatsapp',
        createdAt: now,
        updatedAt: now,
        level: 1,
        parts: [
          {
            screenId: 'wa_chat',
            image: input.image,
            width: 390,
            height: 844,
            steps: [
              {
                index: 0,
                target: {
                  box: { x: 0.86 - 0.07, y: 0.94 - 0.035, w: 0.14, h: 0.07 },
                  source: 'map-fallback',
                  confidence: 0.95,
                  label: 'Camera',
                },
                captionUr: 'یہ کیمرے کا نشان دبائیں',
                whyUr: 'اس سے آپ کی تصویریں کھلیں گی',
                voice: 'wa_photo_2.mp3',
                labelEn: 'Camera',
                expectNext: 'wa_photo_preview',
              },
              {
                index: 1,
                target: {
                  box: { x: 0.9 - 0.07, y: 0.93 - 0.035, w: 0.14, h: 0.07 },
                  source: 'map-text',
                  confidence: 0.95,
                  label: 'Send',
                },
                captionUr: 'اب یہ ہرا تیر دبائیں',
                whyUr: 'اس سے تصویر چلی جائے گی',
                voice: 'wa_photo_4.mp3',
                labelEn: 'Send',
              },
            ],
          },
        ],
        completed: false,
      }

      currentLesson = lesson
      return { kind: 'lesson', lesson }
    },

    async check(_input: {
      image: Blob
      lessonId: string
      redactions?: RedactRect[]
    }): Promise<CheckResult> {
      await new Promise((resolve) => setTimeout(resolve, 300))
      checkCount++

      if (!currentLesson) {
        return { kind: 'unknown' }
      }

      // Alternates hint -> pass(done)
      if (checkCount % 2 === 1) {
        return {
          kind: 'hint',
          lesson: currentLesson,
          step: currentLesson.parts[0].steps[0],
        }
      }

      currentLesson.completed = true
      currentLesson.updatedAt = Date.now()
      return {
        kind: 'pass',
        lesson: currentLesson,
        done: true,
      }
    },

    async warmUp(models?: ModelId[]): Promise<void> {
      simulateModelLoading()
      if (models && models.length > 0) {
        // acknowledged targets
      }
    },

    onProgress(cb: (e: LoadProgress) => void): () => void {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
  }
}
