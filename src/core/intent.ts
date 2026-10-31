import type { TaskId } from '@/types/contracts'
import { containsPhrase, normalise } from '@/core/text'
import { TASK_INTENTS } from '@/data/intents'

export interface IntentResult {
  task: TaskId | null
  confidence: number
  hits: string[]
}

/**
 * Matches normalised text against task keyword lists in Urdu, Roman Urdu, and English.
 * Pure function: calculates hits per TaskId and returns winning task with confidence score,
 * or null on ties / zero hits.
 */
export function matchIntent(text: string): IntentResult {
  const normText = normalise(text)
  if (!normText) {
    return { task: null, confidence: 0, hits: [] }
  }

  const taskEntries = Object.entries(TASK_INTENTS) as [TaskId, string[]][]
  const hitsByTask: Record<TaskId, string[]> = {
    photo: [],
    video_call: [],
    voice_note: [],
    send_money: [],
  }
  const allHits: string[] = []

  for (const [task, phrases] of taskEntries) {
    for (const phrase of phrases) {
      if (containsPhrase(normText, phrase)) {
        hitsByTask[task].push(phrase)
        allHits.push(phrase)
      }
    }
  }

  let maxHits = 0
  let winningTask: TaskId | null = null
  let isTie = false

  for (const [task] of taskEntries) {
    const count = hitsByTask[task].length
    if (count > maxHits) {
      maxHits = count
      winningTask = task
      isTie = false
    } else if (count > 0 && count === maxHits) {
      isTie = true
    }
  }

  if (maxHits === 0) {
    return { task: null, confidence: 0, hits: [] }
  }

  if (isTie || !winningTask) {
    return { task: null, confidence: 0, hits: allHits }
  }

  const confidence = Math.min(1, maxHits / 2)
  return { task: winningTask, confidence, hits: hitsByTask[winningTask] }
}
