/**
 * Audio processing utilities for speech recognition and text-to-speech.
 */

/**
 * Converts an audio Blob into mono 16kHz PCM Float32Array.
 * Uses Web Audio API decodeAudioData and OfflineAudioContext.
 */
export async function blobToPcm16k(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer()
  const AudioCtx =
    window.AudioContext ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).webkitAudioContext

  if (!AudioCtx) {
    throw new Error('AudioContext is not supported in this environment')
  }

  const audioCtx = new AudioCtx()
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    const targetSampleRate = 16000
    const targetLength = Math.max(1, Math.round(audioBuffer.duration * targetSampleRate))

    const OfflineCtx =
      window.OfflineAudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitOfflineAudioContext

    if (!OfflineCtx) {
      // Fallback: simple mono downmixing from original channel data
      return audioBuffer.getChannelData(0)
    }

    const offlineCtx = new OfflineCtx(1, targetLength, targetSampleRate)
    const source = offlineCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineCtx.destination)
    source.start(0)

    const rendered = await offlineCtx.startRendering()
    return rendered.getChannelData(0)
  } finally {
    if (typeof audioCtx.close === 'function') {
      await audioCtx.close().catch(() => {})
    }
  }
}

/**
 * Converts a Float32Array PCM buffer to a 16-bit mono PCM WAV Uint8Array.
 * Pure function with manual 44-byte RIFF header generation.
 */
export function pcmToWav(pcm: Float32Array, rate: number): Uint8Array {
  const numChannels = 1
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const byteRate = rate * blockAlign
  const dataSize = pcm.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // 1. "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')

  // 2. "fmt " subchunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true) // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // 3. "data" subchunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // 4. Write PCM samples as 16-bit signed integers
  let offset = 44
  for (let i = 0; i < pcm.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, pcm[i]))
    const val = s < 0 ? s * 0x8000 : s * 0x7fff
    view.setInt16(offset, Math.round(val), true)
  }

  return new Uint8Array(buffer)
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
