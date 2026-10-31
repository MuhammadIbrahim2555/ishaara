import type { FadeLevel, LearnEventType, SkillProgress, TaskId } from '@/types/contracts'

/**
 * Creates an empty initial skill progress record.
 */
export function emptySkill(task: TaskId): SkillProgress {
  return {
    task,
    level: 1,
    timesPracticed: 0,
    timesPassed: 0,
    hintsInARow: 0,
    lastPracticed: 0,
    stuck: false,
  }
}

/**
 * Computes the scaffolding fading level from completed tasks and hint state.
 * timesPassed counts completed whole tasks, not individual steps.
 * Level 1: Full video guidance (0 completions)
 * Level 2: Spotlight / glow hint (1 completion)
 * Level 3: Self-action with hint button on demand (2+ completions)
 * If stuck or hintsInARow >= 2, the level drops by one (minimum 1).
 */
export function levelFor(skill: {
  timesPassed: number
  hintsInARow: number
  stuck?: boolean
}): FadeLevel {
  const base: FadeLevel = skill.timesPassed === 0 ? 1 : skill.timesPassed === 1 ? 2 : 3
  if (skill.stuck || skill.hintsInARow >= 2) {
    return Math.max(1, base - 1) as FadeLevel
  }
  return base
}

/**
 * Updates a skill's progress after a learning event.
 * - done: a whole task completed -> timesPassed++, clears stuck and hintsInARow
 * - pass: a single step passed -> resets hintsInARow only (level unchanged)
 * - hint: increases hintsInARow; if hintsInARow >= 2, sets stuck = true (level drops by 1)
 * - lesson / replay: increases timesPracticed
 */
export function nextSkill(prev: SkillProgress, ev: LearnEventType, now: number): SkillProgress {
  let timesPracticed = prev.timesPracticed
  let timesPassed = prev.timesPassed
  let hintsInARow = prev.hintsInARow
  let stuck = prev.stuck

  if (ev === 'done') {
    timesPassed++
    hintsInARow = 0
    stuck = false
  } else if (ev === 'pass') {
    hintsInARow = 0
  } else if (ev === 'hint') {
    hintsInARow++
    if (hintsInARow >= 2) {
      stuck = true
    }
  } else if (ev === 'lesson' || ev === 'replay') {
    timesPracticed++
  }

  const level = levelFor({ timesPassed, hintsInARow, stuck })

  return {
    task: prev.task,
    level,
    timesPracticed,
    timesPassed,
    hintsInARow,
    lastPracticed: now,
    stuck,
  }
}
