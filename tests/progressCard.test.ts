import { describe, expect, it } from 'vitest'
import { renderProgressCard } from '@/core/progressCard'
import type { ProgressSummary } from '@/types/contracts'

const hasOffscreenCanvas = typeof OffscreenCanvas !== 'undefined'

describe('renderProgressCard', () => {
  it.skipIf(!hasOffscreenCanvas)('renders a PNG blob using OffscreenCanvas', async () => {
    const summary: ProgressSummary = {
      learnedCount: 2,
      weeklyCompleted: 4,
      callsSavedThisWeek: 3,
      skills: [
        {
          task: 'photo',
          level: 3,
          stuck: false,
          timesPracticed: 5,
          timesPassed: 5,
          hintsInARow: 0,
          lastPracticed: Date.now(),
        },
        {
          task: 'video_call',
          level: 2,
          stuck: false,
          timesPracticed: 3,
          timesPassed: 2,
          hintsInARow: 1,
          lastPracticed: Date.now(),
        },
      ],
    }

    const blob = await renderProgressCard(summary, { elderName: 'Ammi' })
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })
})
