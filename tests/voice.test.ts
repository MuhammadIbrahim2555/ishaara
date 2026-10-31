import { describe, expect, it } from 'vitest'
import { pickSource, voiceKey } from '@/core/voiceSelect'

describe('voiceKey', () => {
  it('extracts base key from file paths with extensions', () => {
    expect(voiceKey('wa_photo_2.mp3')).toBe('wa_photo_2')
    expect(voiceKey('/voice/wa_video_1.wav')).toBe('wa_video_1')
    expect(voiceKey('nested/path/to/clip.ogg')).toBe('clip')
    expect(voiceKey('welcome')).toBe('welcome')
  })
})

describe('pickSource priority', () => {
  const manifest = {
    wa_photo_2: { file: 'wa_photo_2.wav', text: 'کیمرہ' },
  }

  it('prioritizes pregen when id is present in manifest', () => {
    const source = pickSource({
      id: 'wa_photo_2',
      manifest,
      mmsAvailable: true,
      browserUrdu: true,
    })
    expect(source).toBe('pregen')
  })

  it('selects mms when id is missing from manifest but mms is available', () => {
    const source = pickSource({
      id: 'unknown_step_phrase',
      manifest,
      mmsAvailable: true,
      browserUrdu: true,
    })
    expect(source).toBe('mms')
  })

  it('selects browser when neither pregen nor mms is available, but browser Urdu exists', () => {
    const source = pickSource({
      id: 'unknown_step_phrase',
      manifest,
      mmsAvailable: false,
      browserUrdu: true,
    })
    expect(source).toBe('browser')
  })

  it('selects none when no voice output method is available', () => {
    const source = pickSource({
      id: 'unknown_step_phrase',
      manifest,
      mmsAvailable: false,
      browserUrdu: false,
    })
    expect(source).toBe('none')
  })
})
