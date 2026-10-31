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

/**
 * Returns the manifest entry for `key` only when it is an OWN property.
 * Plain `in` / `[]` lookups would match prototype members such as 'constructor'.
 */
export function manifestEntry(
  manifest: Record<string, unknown>,
  key: string
): unknown {
  return Object.prototype.hasOwnProperty.call(manifest, key) ? manifest[key] : undefined
}

/** True when `id` (or its voiceKey) is a pre-generated clip in the manifest. */
export function hasPregenClip(manifest: Record<string, unknown>, id?: string): boolean {
  if (!id || !manifest) return false
  return (
    manifestEntry(manifest, id) !== undefined ||
    manifestEntry(manifest, voiceKey(id)) !== undefined
  )
}

/** True when the text contains Arabic-script letters (Urdu). */
export function isUrduText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
}

/** Browser speech language prefix for a text: 'ur' for Urdu script, otherwise 'en'. */
export function speechLangFor(text: string): 'ur' | 'en' {
  return isUrduText(text) ? 'ur' : 'en'
}

/** First installed browser voice whose lang starts with `lang`, or undefined. */
export function pickBrowserVoice<V extends { lang: string }>(
  voices: readonly V[],
  lang: 'ur' | 'en'
): V | undefined {
  return voices.find((v) => typeof v.lang === 'string' && v.lang.toLowerCase().startsWith(lang))
}

export interface PickSourceOptions {
  id?: string
  manifest: Record<string, unknown>
  /** Text about to be spoken. Undefined is treated as Urdu (the app's instruction language). */
  text?: string
  /** True when the on-device Urdu MMS-TTS model is loaded or loadable. */
  mmsAvailable: boolean
  /** True when the browser exposes speechSynthesis. */
  browserSpeech: boolean
}

/**
 * Determines the source for voice playback:
 * 1. 'pregen': `id` (or its voiceKey) is a clip in `manifest` (instant)
 * 2. 'mms': Urdu text (or no text given) and the on-device MMS-TTS model is available
 * 3. 'browser': English text and speechSynthesis exists
 * 4. 'none': otherwise (captions only). No cross-fallbacks between Urdu and English.
 */
export function pickSource(options: PickSourceOptions): VoiceSource {
  const { id, manifest, text, mmsAvailable, browserSpeech } = options
  if (hasPregenClip(manifest, id)) {
    return 'pregen'
  }
  const urdu = text === undefined || isUrduText(text)
  if (urdu) {
    return mmsAvailable ? 'mms' : 'none'
  }
  if (browserSpeech) {
    return 'browser'
  }
  return 'none'
}
