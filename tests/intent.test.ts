import { describe, expect, it } from 'vitest'
import { matchIntent } from '@/core/intent'

describe('matchIntent', () => {
  it('matches Urdu script intents', () => {
    const photo = matchIntent('تصویر کھینچیں')
    expect(photo.task).toBe('photo')
    expect(photo.confidence).toBeGreaterThan(0)

    const video = matchIntent('ویڈیو کال کریں')
    expect(video.task).toBe('video_call')
    expect(video.confidence).toBeGreaterThan(0)

    const voice = matchIntent('وائس نوٹ بھیجیں')
    expect(voice.task).toBe('voice_note')
    expect(voice.confidence).toBeGreaterThan(0)

    const money = matchIntent('پیسے بھیجنا ہے')
    expect(money.task).toBe('send_money')
    expect(money.confidence).toBeGreaterThan(0)
  })

  it('matches Roman Urdu intents', () => {
    const photo = matchIntent('tasveer bhejo')
    expect(photo.task).toBe('photo')
    expect(photo.confidence).toBeGreaterThan(0)

    const call = matchIntent('dekh kar baat karni hai')
    expect(call.task).toBe('video_call')
    expect(call.confidence).toBeGreaterThan(0)

    const money = matchIntent('jazzcash transfer karna hai')
    expect(money.task).toBe('send_money')
    expect(money.confidence).toBeGreaterThan(0)
  })

  it('matches English intents', () => {
    const photo = matchIntent('take a picture')
    expect(photo.task).toBe('photo')
    expect(photo.confidence).toBeGreaterThan(0)

    const video = matchIntent('start video call')
    expect(video.task).toBe('video_call')
    expect(video.confidence).toBeGreaterThan(0)

    const money = matchIntent('send money now')
    expect(money.task).toBe('send_money')
    expect(money.confidence).toBeGreaterThan(0)
  })

  it('returns task: null on ties between different tasks', () => {
    // Both 'photo' and 'call' have 1 hit each
    const tie = matchIntent('photo call')
    expect(tie.task).toBeNull()
    expect(tie.confidence).toBe(0)
  })

  it('returns task: null and confidence: 0 on no hits or empty text', () => {
    const empty = matchIntent('')
    expect(empty.task).toBeNull()
    expect(empty.confidence).toBe(0)
    expect(empty.hits).toEqual([])

    const unknown = matchIntent('weather forecast today')
    expect(unknown.task).toBeNull()
    expect(unknown.confidence).toBe(0)
    expect(unknown.hits).toEqual([])
  })
})
