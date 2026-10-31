import { describe, expect, it, vi } from 'vitest'
import type { ElderProgressDoc, ProgressSummary } from '@/types/contracts'
import { createFamily } from '@/sync/family'

function createTestStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

describe('FamilyService pushProgress & allow-list', () => {
  const sampleSummary: ProgressSummary = {
    learnedCount: 2,
    weeklyCompleted: 5,
    callsSavedThisWeek: 3,
    skills: [
      {
        task: 'photo',
        level: 3,
        stuck: false,
        timesPracticed: 10,
        timesPassed: 9,
        hintsInARow: 0,
        lastPracticed: 123456789,
      },
      {
        task: 'video_call',
        level: 2,
        stuck: true,
        timesPracticed: 4,
        timesPassed: 2,
        hintsInARow: 2,
        lastPracticed: 123456799,
      },
    ],
  }

  it('skips writing progress when sharing is off', async () => {
    const mockWriter = vi.fn().mockResolvedValue(undefined)
    const storage = createTestStorage({
      'ishaara.family.v1': JSON.stringify({ familyId: 'fam-1', elderName: 'Ammi' }),
      'ishaara.sharing.v1': 'false',
    })

    const service = createFamily({
      storage,
      debounceMs: 0,
      writeElderDoc: mockWriter,
    })

    await service.pushProgress(sampleSummary)
    expect(mockWriter).not.toHaveBeenCalled()
  })

  it('skips writing progress when not linked to a family', async () => {
    const mockWriter = vi.fn().mockResolvedValue(undefined)
    const storage = createTestStorage({
      'ishaara.sharing.v1': 'true',
    })

    const service = createFamily({
      storage,
      debounceMs: 0,
      writeElderDoc: mockWriter,
    })

    await service.pushProgress(sampleSummary)
    expect(mockWriter).not.toHaveBeenCalled()
  })

  it('writes strictly the allowed ElderProgressDoc fields when linked and sharing is on', async () => {
    let capturedDoc: ElderProgressDoc | null = null
    const mockWriter = vi
      .fn()
      .mockImplementation(
        async (_familyId: string, _elderId: string, data: ElderProgressDoc) => {
          capturedDoc = data
        },
      )

    const storage = createTestStorage({
      'ishaara.family.v1': JSON.stringify({ familyId: 'fam-123', elderName: 'Ammi Jaan' }),
      'ishaara.sharing.v1': 'true',
    })

    const fixedNow = 1700000000000
    const service = createFamily({
      storage,
      debounceMs: 0,
      now: () => fixedNow,
      writeElderDoc: mockWriter,
    })

    await service.pushProgress(sampleSummary)

    expect(mockWriter).toHaveBeenCalledTimes(1)
    expect(mockWriter).toHaveBeenCalledWith('fam-123', 'anonymous', expect.any(Object))
    expect(capturedDoc).not.toBeNull()

    // 1. Validate top-level keys match exact allow-list
    const topLevelKeys = Object.keys(capturedDoc!).sort()
    const expectedKeys = [
      'callsSavedThisWeek',
      'elderId',
      'learnedCount',
      'name',
      'skills',
      'updatedAt',
      'weeklyCompleted',
    ].sort()
    expect(topLevelKeys).toEqual(expectedKeys)

    // 2. Validate values
    expect(capturedDoc!.name).toBe('Ammi Jaan')
    expect(capturedDoc!.learnedCount).toBe(2)
    expect(capturedDoc!.weeklyCompleted).toBe(5)
    expect(capturedDoc!.callsSavedThisWeek).toBe(3)
    expect(capturedDoc!.updatedAt).toBe(fixedNow)

    // 3. Validate skill sub-objects strip all non-ElderSkillShare fields (e.g. timesPracticed, hintsInARow)
    expect(capturedDoc!.skills).toHaveLength(2)
    for (const skill of capturedDoc!.skills) {
      const skillKeys = Object.keys(skill).sort()
      expect(skillKeys).toEqual(['lastPracticed', 'level', 'stuck', 'task'].sort())
      expect(skill).not.toHaveProperty('timesPracticed')
      expect(skill).not.toHaveProperty('timesPassed')
      expect(skill).not.toHaveProperty('hintsInARow')
    }
  })

  it('resets remote doc to zeros when setSharing(false) is called', async () => {
    let resetDoc: ElderProgressDoc | null = null
    const mockWriter = vi
      .fn()
      .mockImplementation(
        async (_familyId: string, _elderId: string, data: ElderProgressDoc) => {
          resetDoc = data
        },
      )

    const storage = createTestStorage({
      'ishaara.family.v1': JSON.stringify({ familyId: 'fam-123', elderName: 'Ammi' }),
      'ishaara.sharing.v1': 'true',
    })

    const service = createFamily({
      storage,
      debounceMs: 0,
      writeElderDoc: mockWriter,
    })

    await service.setSharing(false)
    expect(service.sharing()).toBe(false)
    expect(mockWriter).toHaveBeenCalledTimes(1)
    expect(resetDoc).not.toBeNull()
    expect(resetDoc!.learnedCount).toBe(0)
    expect(resetDoc!.weeklyCompleted).toBe(0)
    expect(resetDoc!.callsSavedThisWeek).toBe(0)
    expect(resetDoc!.skills).toEqual([])
  })
})
