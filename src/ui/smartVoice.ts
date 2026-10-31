import type { Pair } from '@/ui/strings'

/** localStorage key for the smart voice choice. Only 'on' sends short audio to Gemini. */
const STORAGE_KEY = 'ishaara.smartVoice.v1'

export type SmartVoiceChoice = 'on' | 'off'

/** 'on' or 'off' once the learner has chosen; null before the consent sheet was answered. */
export function getSmartVoice(): SmartVoiceChoice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw === 'on' || raw === 'off' ? raw : null
  } catch {
    // Storage unavailable (private window, blocked site data): treat as not yet chosen.
    return null
  }
}

export function setSmartVoice(value: SmartVoiceChoice): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Storage unavailable: the choice lasts for this page visit only.
  }
}

/** Copy for the consent sheet and the Settings row. Each block shows the current language only. */
export const SMART_VOICE_COPY = {
  consentTitle: { ur: 'آواز بہتر سمجھنے کے لیے', en: 'Understand your voice better' },
  consentBody: {
    ur: 'جب آپ بولیں گی، صرف آپ کا بولا ہوا سوال (چند سیکنڈ کی آواز) گوگل جیمنائی کو بھیجا جائے گا تاکہ وہ اردو اور پنجابی اچھی طرح سمجھ سکے۔ آپ کی اسکرین کی تصویریں کبھی نہیں بھیجی جاتیں۔ آپ یہ ترتیبات میں کبھی بھی بند کر سکتی ہیں۔',
    en: 'When you speak, only your spoken question (a few seconds of audio) is sent to Google Gemini so it can understand Urdu and Punjabi well. Pictures of your screen are never sent. You can turn this off in Settings anytime.',
  },
  allow: { ur: 'ٹھیک ہے، اجازت ہے', en: 'Yes, allow' },
  keepOnPhone: { ur: 'نہیں، فون پر ہی رکھیں', en: 'No, keep it on this phone' },
  settingTitle: { ur: 'سمارٹ آواز (آن لائن)', en: 'Smart voice (online)' },
  settingOn: { ur: 'صرف بولا ہوا سوال گوگل کو جاتا ہے', en: 'Only your spoken question goes to Google' },
  settingOff: { ur: 'آواز فون پر ہی سمجھی جاتی ہے', en: 'Voice is understood on this phone' },
  chipGemini: { ur: 'آن لائن', en: 'Gemini' },
  chipWhisper: { ur: 'اس فون پر', en: 'On this phone' },
} satisfies Record<string, Pair>
