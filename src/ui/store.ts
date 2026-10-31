import { create } from 'zustand'

const TEXT_SIZES = ['normal', 'large', 'xl'] as const
const CONTRASTS = ['normal', 'high'] as const
const LANGS = ['ur', 'en'] as const

export type TextSize = (typeof TEXT_SIZES)[number]
export type Contrast = (typeof CONTRASTS)[number]
export type Lang = (typeof LANGS)[number]

export interface Settings {
  textSize: TextSize
  contrast: Contrast
  simpleMode: boolean
  lang: Lang
  onboarded: boolean
}

export interface SessionState {
  currentLessonId?: string
}

interface UiState {
  settings: Settings
  session: SessionState
  setSettings: (patch: Partial<Settings>) => void
  setSession: (patch: Partial<SessionState>) => void
}

const STORAGE_KEY = 'ishaara.settings.v1'

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
}

/** Simple mode defaults on for reduced motion or low-memory devices. */
function defaultSettings(): Settings {
  let simpleMode = false
  try {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
    simpleMode = reduced || (typeof memory === 'number' && memory < 4)
  } catch {
    simpleMode = false
  }
  return { textSize: 'normal', contrast: 'normal', simpleMode, lang: 'ur', onboarded: false }
}

function loadSettings(): Settings {
  const base = defaultSettings()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const saved = JSON.parse(raw) as Partial<Record<keyof Settings, unknown>>
    return {
      textSize: isOneOf(saved.textSize, TEXT_SIZES) ? saved.textSize : base.textSize,
      contrast: isOneOf(saved.contrast, CONTRASTS) ? saved.contrast : base.contrast,
      simpleMode: typeof saved.simpleMode === 'boolean' ? saved.simpleMode : base.simpleMode,
      lang: isOneOf(saved.lang, LANGS) ? saved.lang : base.lang,
      onboarded: typeof saved.onboarded === 'boolean' ? saved.onboarded : base.onboarded,
    }
  } catch {
    return base
  }
}

function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable (private window, blocked site data): settings last for this session only.
  }
}

export const useUiStore = create<UiState>()((set) => ({
  settings: loadSettings(),
  session: {},
  setSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
  setSession: (patch) => set((state) => ({ session: { ...state.session, ...patch } })),
}))

useUiStore.subscribe((state, prev) => {
  if (state.settings !== prev.settings) saveSettings(state.settings)
})
