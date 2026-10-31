import { describe, expect, it } from 'vitest'
import { createMetrics } from '@/core/metrics'

describe('MetricsService', () => {
  it('times async operations and computes snapshots and averages', async () => {
    const metrics = createMetrics()

    const res1 = await metrics.time('ocr', async () => {
      return 'done-ocr'
    })
    expect(res1).toBe('done-ocr')

    await metrics.time('ocr', async () => {
      return 'done-ocr-2'
    })

    const snapshot = metrics.snapshot()
    const ocrMetric = snapshot.find((m) => m.name === 'ocr')

    expect(ocrMetric).toBeDefined()
    expect(ocrMetric?.count).toBe(2)
    expect(ocrMetric?.avgMs).toBeGreaterThanOrEqual(0)
    expect(ocrMetric?.lastMs).toBeGreaterThanOrEqual(0)
  })

  it('limits stored samples to 50 entries per metric', async () => {
    const metrics = createMetrics()

    for (let i = 0; i < 60; i++) {
      await metrics.time('vision', async () => i)
    }

    const snapshot = metrics.snapshot()
    const visionMetric = snapshot.find((m) => m.name === 'vision')

    expect(visionMetric).toBeDefined()
    expect(visionMetric?.count).toBe(50)
  })

  it('records timing even if the measured function throws', async () => {
    const metrics = createMetrics()

    await expect(
      metrics.time('translate', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    const snapshot = metrics.snapshot()
    const translateMetric = snapshot.find((m) => m.name === 'translate')

    expect(translateMetric).toBeDefined()
    expect(translateMetric?.count).toBe(1)
  })
})
