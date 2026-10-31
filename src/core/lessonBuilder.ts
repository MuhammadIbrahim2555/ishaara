import type { LessonPart, LessonStep, OcrResult, ScreenMap, TaskId } from '@/types/contracts'
import { resolveTarget } from './targets'

/**
 * Builds a single lesson part for a matched screen map and task.
 * Resolves each step's target button via OCR word matching or fallbacks.
 * Returns null if the screen map defines no steps for the given task.
 */
export function buildPart(
  map: ScreenMap,
  task: TaskId,
  ocr: OcrResult,
  image: Blob,
): LessonPart | null {
  const mapSteps = map.tasks[task]
  if (!mapSteps || mapSteps.length === 0) {
    return null
  }

  const steps: LessonStep[] = mapSteps.map((mStep, index) => {
    const target = resolveTarget(mStep, ocr)
    return {
      index,
      target,
      captionUr: mStep.captionUr,
      whyUr: mStep.whyUr,
      captionEn: mStep.captionEn,
      whyEn: mStep.whyEn,
      voice: mStep.voice,
      labelEn: mStep.labelEn,
      expectNext: mStep.expectNext,
    }
  })

  return {
    screenId: map.id,
    image,
    width: ocr.width,
    height: ocr.height,
    steps,
  }
}
