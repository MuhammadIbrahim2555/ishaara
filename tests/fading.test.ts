import { describe, expect, it } from 'vitest'
import { emptySkill, levelFor, nextSkill } from '@/core/fading'

describe('scaffolding fading logic', () => {
  it('creates empty initial skill at level 1 with 0 counts', () => {
    const s = emptySkill('photo')
    expect(s.task).toBe('photo')
    expect(s.level).toBe(1)
    expect(s.timesPracticed).toBe(0)
    expect(s.timesPassed).toBe(0)
    expect(s.hintsInARow).toBe(0)
    expect(s.stuck).toBe(false)
  })

  it('determines level progression based on completed tasks (timesPassed)', () => {
    expect(levelFor({ timesPassed: 0, hintsInARow: 0 })).toBe(1)
    expect(levelFor({ timesPassed: 1, hintsInARow: 0 })).toBe(2)
    expect(levelFor({ timesPassed: 2, hintsInARow: 0 })).toBe(3)
    expect(levelFor({ timesPassed: 10, hintsInARow: 0 })).toBe(3)
  })

  it('drops level by one when hintsInARow >= 2 or stuck, minimum 1', () => {
    // If timesPassed = 2 (base level 3), drops to level 2
    expect(levelFor({ timesPassed: 2, hintsInARow: 2 })).toBe(2)
    // If timesPassed = 1 (base level 2), drops to level 1
    expect(levelFor({ timesPassed: 1, hintsInARow: 2 })).toBe(1)
    // Level cannot drop below 1
    expect(levelFor({ timesPassed: 0, hintsInARow: 3 })).toBe(1)
    // Stuck keeps the drop even after hints are reset
    expect(levelFor({ timesPassed: 2, hintsInARow: 0, stuck: true })).toBe(2)
    expect(levelFor({ timesPassed: 0, hintsInARow: 0, stuck: true })).toBe(1)
  })

  it('progresses per completed task, not per step', () => {
    let s = emptySkill('video_call')
    const t0 = 1000

    // 1. Practice lesson
    s = nextSkill(s, 'lesson', t0)
    expect(s.timesPracticed).toBe(1)
    expect(s.level).toBe(1)

    // 2. Step passes never change the level
    s = nextSkill(s, 'pass', t0 + 10)
    s = nextSkill(s, 'pass', t0 + 20)
    s = nextSkill(s, 'pass', t0 + 30)
    expect(s.timesPassed).toBe(0)
    expect(s.level).toBe(1)
    expect(s.hintsInARow).toBe(0)
    expect(s.stuck).toBe(false)

    // 3. First completed task -> level 2
    s = nextSkill(s, 'done', t0 + 40)
    expect(s.timesPassed).toBe(1)
    expect(s.level).toBe(2)

    // 4. Second completed task -> level 3
    s = nextSkill(s, 'done', t0 + 50)
    expect(s.timesPassed).toBe(2)
    expect(s.level).toBe(3)

    // 5. One hint -> hintsInARow = 1, level stays 3
    s = nextSkill(s, 'hint', t0 + 60)
    expect(s.hintsInARow).toBe(1)
    expect(s.level).toBe(3)
    expect(s.stuck).toBe(false)

    // 6. Second consecutive hint -> stuck = true, level drops to 2
    s = nextSkill(s, 'hint', t0 + 70)
    expect(s.hintsInARow).toBe(2)
    expect(s.level).toBe(2)
    expect(s.stuck).toBe(true)

    // 7. A step pass resets hints but does not change the level
    s = nextSkill(s, 'pass', t0 + 80)
    expect(s.hintsInARow).toBe(0)
    expect(s.level).toBe(2)
    expect(s.stuck).toBe(true)

    // 8. Completing the task clears stuck and restores level 3 (3 completions)
    s = nextSkill(s, 'done', t0 + 90)
    expect(s.timesPassed).toBe(3)
    expect(s.hintsInARow).toBe(0)
    expect(s.stuck).toBe(false)
    expect(s.level).toBe(3)
  })

  it('replay increments timesPracticed only', () => {
    let s = emptySkill('photo')
    s = nextSkill(s, 'replay', 5)
    expect(s.timesPracticed).toBe(1)
    expect(s.timesPassed).toBe(0)
    expect(s.level).toBe(1)
  })
})
