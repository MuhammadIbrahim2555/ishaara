import type { Lesson, LessonStep, OcrResult, ScreenMap } from '@/types/contracts'
import { matchScreen } from './matcher'

export type EvaluationResult =
  | { kind: 'pass'; screen: ScreenMap; done: boolean }
  | { kind: 'hint'; step: LessonStep }
  | { kind: 'unknown' }

/**
 * Evaluates a user's verification screenshot against a lesson's current progress.
 * Determines whether the user passed to the expected screen, needs a hint, or is in an unknown state.
 */
export function evaluateCheck({
  lesson,
  ocr,
  maps,
}: {
  lesson: Lesson
  ocr: OcrResult
  maps: ScreenMap[]
}): EvaluationResult {
  if (lesson.parts.length === 0) {
    return { kind: 'unknown' }
  }

  const matched = matchScreen(ocr, maps)
  if (!matched) {
    return { kind: 'unknown' }
  }

  const lastPart = lesson.parts[lesson.parts.length - 1]
  const lastStep = lastPart.steps[lastPart.steps.length - 1]
  const expectedScreenId = lastStep?.expectNext

  // Case 1: User navigated to the expected next screen
  if (expectedScreenId && matched.map.id === expectedScreenId) {
    const nextSteps = matched.map.tasks[lesson.task]
    const done = !nextSteps || nextSteps.length === 0
    return {
      kind: 'pass',
      screen: matched.map,
      done,
    }
  }

  // Case 2: Final step has no expectNext. Any known screen other than the current one means
  // the user went on after the last action (e.g. pressed Send and is back in chat): lesson done.
  if (lastStep && !expectedScreenId && matched.map.id !== lastPart.screenId) {
    return {
      kind: 'pass',
      screen: matched.map,
      done: true,
    }
  }

  // Case 3: User hasn't moved from the current screen yet -> give hint
  if (matched.map.id === lastPart.screenId) {
    const firstStep = lastPart.steps[0]
    if (firstStep) {
      return {
        kind: 'hint',
        step: firstStep,
      }
    }
  }

  // Case 4: Screen did not match expectation or current screen
  return { kind: 'unknown' }
}
