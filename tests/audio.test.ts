import { describe, expect, it } from 'vitest'
import { pcmToWav } from '@/ai/audio'

describe('pcmToWav', () => {
  it('creates valid 44-byte WAV header and PCM payload', () => {
    const sampleRate = 16000
    // 100 samples
    const pcm = new Float32Array(100)
    for (let i = 0; i < pcm.length; i++) {
      pcm[i] = Math.sin((i / pcm.length) * Math.PI * 2)
    }

    const wav = pcmToWav(pcm, sampleRate)
    expect(wav.byteLength).toBe(44 + 100 * 2)

    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)

    // RIFF identifier
    const riff = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    )
    expect(riff).toBe('RIFF')

    // File size - 8
    expect(view.getUint32(4, true)).toBe(36 + 100 * 2)

    // WAVE identifier
    const wave = String.fromCharCode(
      view.getUint8(8),
      view.getUint8(9),
      view.getUint8(10),
      view.getUint8(11)
    )
    expect(wave).toBe('WAVE')

    // fmt subchunk
    const fmt = String.fromCharCode(
      view.getUint8(12),
      view.getUint8(13),
      view.getUint8(14),
      view.getUint8(15)
    )
    expect(fmt).toBe('fmt ')
    expect(view.getUint32(16, true)).toBe(16) // PCM subchunk size
    expect(view.getUint16(20, true)).toBe(1) // PCM format
    expect(view.getUint16(22, true)).toBe(1) // Mono channel
    expect(view.getUint32(24, true)).toBe(sampleRate) // Sample rate
    expect(view.getUint32(28, true)).toBe(sampleRate * 2) // Byte rate
    expect(view.getUint16(32, true)).toBe(2) // Block align
    expect(view.getUint16(34, true)).toBe(16) // 16 bits per sample

    // data subchunk
    const data = String.fromCharCode(
      view.getUint8(36),
      view.getUint8(37),
      view.getUint8(38),
      view.getUint8(39)
    )
    expect(data).toBe('data')
    expect(view.getUint32(40, true)).toBe(100 * 2) // Data chunk size
  })
})
