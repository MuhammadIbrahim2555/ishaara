import type { VoiceSource } from '@/types/contracts'

/**
 * Extracts a clean voice key from a step voice file path or name.
 * e.g. 'wa_photo_2.mp3', '/voice/wa_photo_2.wav', or 'wa_photo_2' -> 'wa_photo_2'.
 */
export function voiceKey(stepVoiceFile: string): string {
  if (!stepVoiceFile) return ''
  const normalized = stepVoiceFile.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  const filename = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.slice(0, lastDot) : filename
}

export interface PickSourceOptions {
  id?: string
  manifest: Record<string, unknown>
  mmsAvailable: boolean
  browserUrdu: boolean
}

/**
 * Determines the source for voice playback based on availability and priority:
 * 1. 'pregen': if `id` is provided and in `manifest`
 * 2. 'mms': if `mmsAvailable` is true
 * 3. 'browser': if `browserUrdu` is true
 * 4. 'none': otherwise
 */
export function pickSource(options: PickSourceOptions): VoiceSource {
  const { id, manifest, mmsAvailable, browserUrdu } = options
  if (
    id &&
    manifest &&
    (id in manifest ||
      manifest[id] !== undefined ||
      voiceKey(id) in manifest ||
      manifest[voiceKey(id)] !== undefined)
  ) {
    return 'pregen'
  }
  if (mmsAvailable) {
    return 'mms'
  }
  if (browserUrdu) {
    return 'browser'
  }
  return 'none'
}
