import { describe, expect, it } from 'vitest'
import { getServices } from '@/core/index'

describe('getServices wiring', () => {
  it('returns family, metrics, and progressCard in mock mode', () => {
    const services = getServices({ mock: true })
    expect(services.family).toBeDefined()
    expect(services.metrics).toBeDefined()
    expect(services.progressCard).toBeDefined()
    expect(typeof services.family.available).toBe('function')
    expect(services.family.available()).toBe(true)
    expect(typeof services.metrics.time).toBe('function')
    expect(typeof services.progressCard).toBe('function')
  })

  it('returns family, metrics, and progressCard in real mode', () => {
    const services = getServices({ mock: false })
    expect(services.family).toBeDefined()
    expect(services.metrics).toBeDefined()
    expect(services.progressCard).toBeDefined()
    expect(typeof services.family.available).toBe('function')
    expect(typeof services.metrics.time).toBe('function')
    expect(typeof services.progressCard).toBe('function')
  })
})
