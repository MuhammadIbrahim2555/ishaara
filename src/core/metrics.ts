import type { MetricsService } from '@/types/contracts'

type MetricName = 'ocr' | 'vision' | 'whisper' | 'tts' | 'translate' | 'analyze' | 'check'

/**
 * Creates an in-memory metrics service recording execution durations for key AI and engine tasks.
 * Retains the last 50 samples per metric name.
 */
export function createMetrics(): MetricsService {
  const store = new Map<MetricName, number[]>()

  return {
    async time<T>(name: MetricName, fn: () => Promise<T>): Promise<T> {
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now()
      try {
        return await fn()
      } finally {
        const end = typeof performance !== 'undefined' ? performance.now() : Date.now()
        const duration = Math.max(0, end - start)
        const samples = store.get(name) ?? []
        samples.push(duration)
        if (samples.length > 50) {
          samples.shift()
        }
        store.set(name, samples)
      }
    },

    snapshot(): { name: string; count: number; avgMs: number; lastMs: number }[] {
      const result: { name: string; count: number; avgMs: number; lastMs: number }[] = []
      for (const [name, samples] of store.entries()) {
        const count = samples.length
        const lastMs = count > 0 ? samples[count - 1] : 0
        const sum = samples.reduce((acc, val) => acc + val, 0)
        const avgMs = count > 0 ? sum / count : 0
        result.push({
          name,
          count,
          avgMs,
          lastMs,
        })
      }
      return result
    },
  }
}
