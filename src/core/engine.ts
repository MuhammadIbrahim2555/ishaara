import type {
  AnalyzeResult,
  CheckResult,
  Engine,
  LibraryService,
  LoadProgress,
  ModelId,
  OcrResult,
  RedactRect,
  ScreenMap,
  Target,
  TaskId,
} from '@/types/contracts'
import { SCREEN_MAPS } from '@/data/maps'
import type { OcrFn } from '@/ai/ocr'
import { evaluateCheck } from './checker'
import { newId } from './id'
import { redactImage } from './image'
import { buildPart } from './lessonBuilder'
import { matchScreen } from './matcher'
import { detectSensitive } from './safety'

export interface EngineDependencies {
  ocr: OcrFn
  /** Loads the OCR models without recognising anything. Preferred by warmUp when present. */
  ocrInit?: () => Promise<void>
  library: LibraryService
  maps?: ScreenMap[]
  vision?: (img: Blob, phrase: string, near?: [number, number]) => Promise<Target | null>
  now?: () => number
}

/**
 * Creates the core Ishaara Engine orchestrating image redaction, OCR, screen matching,
 * safety guards, lesson building, and step verification.
 */
export function createEngine(deps: EngineDependencies): Engine {
  const maps = deps.maps ?? SCREEN_MAPS
  const getNow = deps.now ?? (() => Date.now())
  const listeners: Set<(e: LoadProgress) => void> = new Set()

  function emitProgress(event: LoadProgress): void {
    for (const cb of listeners) {
      try {
        cb(event)
      } catch {
        // ignore subscriber exceptions
      }
    }
  }

  return {
    async analyze(input: {
      image: Blob
      task: TaskId
      redactions: RedactRect[]
      lessonId?: string
    }): Promise<AnalyzeResult> {
      try {
        // 1. Redact image on device before any processing or OCR
        const {
          blob: redactedBlob,
          width,
          height,
        } = await redactImage(input.image, input.redactions)

        // 2. Run OCR on the redacted image; a failure or timeout means the screen is unreadable
        let ocr: OcrResult
        try {
          ocr = await deps.ocr(redactedBlob)
        } catch {
          return {
            kind: 'ask-family',
            reason: 'unreadable',
            image: redactedBlob,
          }
        }
        if (!ocr.width) ocr.width = width
        if (!ocr.height) ocr.height = height

        // 3. Reject unreadable images (< 3 words)
        if (ocr.words.length < 3) {
          return {
            kind: 'ask-family',
            reason: 'unreadable',
            image: redactedBlob,
          }
        }

        // 4. Safety stop on OTP / PIN / Password / Card detection
        const sensitive = detectSensitive(ocr)
        if (sensitive) {
          return {
            kind: 'safety-stop',
            reason: sensitive.reason,
            matched: sensitive.matched,
          }
        }

        // 5. Match screen signature against registered screen maps
        const match = matchScreen(ocr, maps)
        if (!match) {
          return {
            kind: 'ask-family',
            reason: 'no-match',
            image: redactedBlob,
          }
        }

        // 6. Build the lesson part
        const part = buildPart(match.map, input.task, ocr, redactedBlob)
        if (!part) {
          return {
            kind: 'ask-family',
            reason: 'no-match',
            image: redactedBlob,
          }
        }

        // 7. Try vision grounding if step fell back to anchor.fallback and has an icon
        const mapSteps = match.map.tasks[input.task] ?? []
        for (let i = 0; i < part.steps.length; i++) {
          const step = part.steps[i]
          const mapStep = mapSteps[i]
          if (step.target.source === 'map-fallback' && mapStep?.anchor.icon && deps.vision) {
            try {
              const visionTarget = await deps.vision(
                redactedBlob,
                mapStep.anchor.icon,
                mapStep.anchor.fallback
              )
              // Only trust vision when its box is near the map's expected spot (confidence 0.8);
              // a far-away match (0.55) may be a different icon, e.g. video-call instead of camera.
              if (visionTarget && visionTarget.confidence >= 0.8) {
                step.target = visionTarget
              }
            } catch {
              // Gracefully keep fallback target if vision lookup fails
            }
          }
        }

        // 8. Reject if every step target has low confidence (< 0.5)
        const allLowConfidence = part.steps.every((s) => s.target.confidence < 0.5)
        if (allLowConfidence) {
          return {
            kind: 'ask-family',
            reason: 'low-confidence',
            image: redactedBlob,
          }
        }

        const now = getNow()

        // 9. Append to existing lesson if lessonId is provided
        if (input.lessonId) {
          const existing = await deps.library.get(input.lessonId)
          if (existing) {
            existing.parts.push(part)
            existing.updatedAt = now
            await deps.library.save(existing)
            await deps.library.logEvent({
              task: input.task,
              type: 'lesson',
              level: existing.level,
              at: now,
            })
            return {
              kind: 'lesson',
              lesson: existing,
            }
          }
        }

        // 10. Create new lesson
        const skill = await deps.library.skill(input.task)
        const lesson = {
          id: newId(),
          task: input.task,
          app: match.map.app,
          createdAt: now,
          updatedAt: now,
          level: skill.level,
          parts: [part],
          completed: false,
        }

        await deps.library.save(lesson)
        await deps.library.logEvent({
          task: input.task,
          type: 'lesson',
          level: lesson.level,
          at: now,
        })

        return {
          kind: 'lesson',
          lesson,
        }
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(`Engine analysis failed: ${err.message}`)
        }
        throw new Error('Engine analysis failed with an unexpected error')
      }
    },

    async check(input: {
      image: Blob
      lessonId: string
      redactions?: RedactRect[]
    }): Promise<CheckResult> {
      try {
        const lesson = await deps.library.get(input.lessonId)
        if (!lesson) {
          return { kind: 'unknown' }
        }

        // 1. Redact image on device
        const {
          blob: redactedBlob,
          width,
          height,
        } = await redactImage(input.image, input.redactions ?? [])

        // 2. Run OCR; a failure or timeout means the check cannot be evaluated
        let ocr: OcrResult
        try {
          ocr = await deps.ocr(redactedBlob)
        } catch {
          return { kind: 'unknown' }
        }
        if (!ocr.width) ocr.width = width
        if (!ocr.height) ocr.height = height

        // 3. Safety check
        const sensitive = detectSensitive(ocr)
        if (sensitive) {
          return {
            kind: 'safety-stop',
            reason: sensitive.reason,
            matched: sensitive.matched,
          }
        }

        // 4. Evaluate check progression
        const evaluation = evaluateCheck({ lesson, ocr, maps })
        const now = getNow()

        if (evaluation.kind === 'pass') {
          if (evaluation.done) {
            lesson.completed = true
            lesson.updatedAt = now
            await deps.library.save(lesson)
            await deps.library.logEvent({
              task: lesson.task,
              type: 'pass',
              level: lesson.level,
              at: now,
            })
            await deps.library.logEvent({
              task: lesson.task,
              type: 'done',
              level: lesson.level,
              at: now,
            })
            return {
              kind: 'pass',
              lesson,
              done: true,
            }
          } else {
            const nextPart = buildPart(evaluation.screen, lesson.task, ocr, redactedBlob)
            if (nextPart) {
              lesson.parts.push(nextPart)
            }
            lesson.updatedAt = now
            await deps.library.save(lesson)
            await deps.library.logEvent({
              task: lesson.task,
              type: 'pass',
              level: lesson.level,
              at: now,
            })
            return {
              kind: 'pass',
              lesson,
              done: false,
            }
          }
        } else if (evaluation.kind === 'hint') {
          await deps.library.logEvent({
            task: lesson.task,
            type: 'hint',
            level: lesson.level,
            at: now,
          })
          return {
            kind: 'hint',
            lesson,
            step: evaluation.step,
          }
        }

        return { kind: 'unknown' }
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(`Engine verification check failed: ${err.message}`)
        }
        throw new Error('Engine verification check failed with an unexpected error')
      }
    },

    async warmUp(models?: ModelId[]): Promise<void> {
      const targets = models ?? ['ocr']
      if (targets.includes('ocr')) {
        emitProgress({
          model: 'ocr',
          status: 'downloading',
          progress: 0.2,
          message: 'Warming up OCR engine...',
        })
        try {
          if (deps.ocrInit) {
            await deps.ocrInit()
          } else {
            // Fallback: warm up OCR with a tiny blank blob
            const dummy = new Blob([''], { type: 'image/png' })
            await deps.ocr(dummy).catch(() => {})
          }
          emitProgress({
            model: 'ocr',
            status: 'ready',
            progress: 1.0,
            message: 'OCR engine ready',
          })
        } catch (err) {
          emitProgress({
            model: 'ocr',
            status: 'error',
            progress: 0,
            message: err instanceof Error ? err.message : String(err),
          })
        }
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
