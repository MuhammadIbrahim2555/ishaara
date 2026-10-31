import { beforeEach, describe, expect, it } from 'vitest'
import type { Lesson } from '@/types/contracts'
import { createLibrary } from '@/core/library'

describe('createLibrary IndexedDB service', () => {
  let currentTime = 1_000_000_000
  const lib = createLibrary({ now: () => currentTime })

  beforeEach(async () => {
    await lib.clear()
    currentTime = 1_000_000_000
  })

  it('saves, gets, and removes a lesson', async () => {
    const lesson: Lesson = {
      id: 'l1',
      task: 'photo',
      app: 'whatsapp',
      createdAt: 100,
      updatedAt: 100,
      level: 1,
      parts: [],
      completed: false,
    }

    await lib.save(lesson)
    const fetched = await lib.get('l1')
    expect(fetched?.id).toBe('l1')

    await lib.remove('l1')
    const deleted = await lib.get('l1')
    expect(deleted).toBeUndefined()
  })

  it('lists lessons sorted by updatedAt descending', async () => {
    const l1: Lesson = {
      id: 'l1',
      task: 'photo',
      app: 'whatsapp',
      createdAt: 100,
      updatedAt: 100,
      level: 1,
      parts: [],
      completed: false,
    }
    const l2: Lesson = {
      id: 'l2',
      task: 'video_call',
      app: 'whatsapp',
      createdAt: 200,
      updatedAt: 500, // newest
      level: 2,
      parts: [],
      completed: false,
    }
    const l3: Lesson = {
      id: 'l3',
      task: 'send_money',
      app: 'jazzcash',
      createdAt: 300,
      updatedAt: 300,
      level: 1,
      parts: [],
      completed: false,
    }

    await lib.save(l1)
    await lib.save(l2)
    await lib.save(l3)

    const list = await lib.list()
    expect(list.length).toBe(3)
    expect(list[0].id).toBe('l2') // 500
    expect(list[1].id).toBe('l3') // 300
    expect(list[2].id).toBe('l1') // 100
  })

  it('wipes all data with clear()', async () => {
    const l1: Lesson = {
      id: 'l1',
      task: 'photo',
      app: 'whatsapp',
      createdAt: 100,
      updatedAt: 100,
      level: 1,
      parts: [],
      completed: false,
    }
    await lib.save(l1)
    await lib.clear()
    const list = await lib.list()
    expect(list.length).toBe(0)
  })

  it('logs events, updates skill, and computes progress with injected now', async () => {
    // Current time: currentTime = 1_000_000_000 ms
    // 7 days window: cutoff = 1_000_000_000 - 604_800_000 = 395_200_000 ms
    // Log two passes on 'photo' inside 7 days window (t = 500_000_000 and 600_000_000)
    await lib.logEvent({ task: 'photo', type: 'pass', level: 1, at: 500_000_000 })
    await lib.logEvent({ task: 'photo', type: 'pass', level: 2, at: 600_000_000 })

    // Step passes are not completed tasks, so the level does not move
    const afterPasses = await lib.skill('photo')
    expect(afterPasses.timesPassed).toBe(0)
    expect(afterPasses.level).toBe(1)

    // Two completed tasks inside the window -> level 3
    await lib.logEvent({ task: 'photo', type: 'done', level: 2, at: 650_000_000 })
    await lib.logEvent({ task: 'photo', type: 'done', level: 3, at: 700_000_000 })

    const skill = await lib.skill('photo')
    expect(skill.timesPassed).toBe(2)
    expect(skill.level).toBe(3)
    expect(skill.stuck).toBe(false)

    // Log a replay event inside 7 days window
    await lib.logEvent({ task: 'photo', type: 'replay', level: 3, at: 800_000_000 })

    // Log an old event outside 7 days window (at t = 100_000_000 ms < 395_200_000 ms)
    await lib.logEvent({ task: 'photo', type: 'done', level: 3, at: 100_000_000 })

    const progress = await lib.progress()
    // Learned count = tasks with level 3 and !stuck
    expect(progress.learnedCount).toBe(1)
    // weeklyCompleted = done events within 7 days (t=650_000_000 and t=700_000_000)
    expect(progress.weeklyCompleted).toBe(2)
    // callsSavedThisWeek = pass at level >= 2 (t=600_000_000) + replay (t=800_000_000)
    expect(progress.callsSavedThisWeek).toBe(2)
  })
})
