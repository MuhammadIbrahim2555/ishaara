/** Unique identifier for supported elder tasks. */
export type TaskId = 'photo' | 'video_call' | 'voice_note' | 'send_money'

/** Identifier for known target apps or unknown screen. */
export type AppId = 'whatsapp' | 'camera' | 'jazzcash' | 'unknown'

/** Normalised 0..1 relative to the image (x,y = top-left). */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Word-level OCR detection result with bounding box and confidence score. */
export interface OcrWord {
  text: string
  box: Box
  confidence: number // confidence 0..100
}

/** Complete result of an OCR pass on an image. */
export interface OcrResult {
  words: OcrWord[]
  fullText: string
  width: number
  height: number
}

/** Anchor definition for locating an interactive element on screen. */
export interface Anchor {
  text?: string[]
  icon?: string
  fallback?: [number, number] // fallback = centre (x,y) 0..1
}

/** Step definition inside a screen map for a specific task. */
export interface MapStep {
  anchor: Anchor
  voice: string
  captionUr: string
  whyUr: string
  captionEn?: string
  whyEn?: string
  labelEn?: string
  expectNext?: string
}

/** Screen signature and associated task step mappings. */
export interface ScreenMap {
  id: string
  app: AppId
  titleUr: string
  match: { any: string[]; minHits: number; none?: string[] }
  tasks: Partial<Record<TaskId, MapStep[]>>
}

/** Strategy used to resolve the button target box. */
export type TargetSource = 'map-text' | 'map-fallback' | 'vision'

/** Resolved interactive target on the screenshot. */
export interface Target {
  box: Box
  source: TargetSource
  confidence: number // confidence 0..1
  label?: string
}

/** Scaffolding fading level: 1 = full video/zoom, 2 = spotlight/glow, 3 = hint button only. */
export type FadeLevel = 1 | 2 | 3

/** Action step presented to the learner. */
export interface LessonStep {
  index: number
  target: Target
  captionUr: string
  whyUr: string
  captionEn?: string
  whyEn?: string
  voice?: string
  labelEn?: string
  expectNext?: string
}

/** Segment of a lesson corresponding to a single screen. */
export interface LessonPart {
  screenId: string | null
  image: Blob
  width: number
  height: number
  steps: LessonStep[]
}

/** Saved multi-part interactive tutorial lesson. */
export interface Lesson {
  id: string
  task: TaskId
  app: AppId
  createdAt: number
  updatedAt: number
  level: FadeLevel
  parts: LessonPart[]
  completed: boolean
}

/** Bounding rectangle to blackout before analysis. */
export interface RedactRect {
  x: number
  y: number
  w: number
  h: number
} // normalised 0..1

/** Security reason for halting lesson creation or checking. */
export type SafetyReason = 'otp' | 'pin' | 'password' | 'card'

/** Result of initial screenshot analysis. */
export type AnalyzeResult =
  | { kind: 'lesson'; lesson: Lesson }
  | { kind: 'safety-stop'; reason: SafetyReason; matched: string }
  | { kind: 'ask-family'; reason: 'no-match' | 'low-confidence' | 'unreadable'; image: Blob }

/** Result of validating the learner's subsequent screenshot. */
export type CheckResult =
  | { kind: 'pass'; lesson: Lesson; done: boolean }
  | { kind: 'hint'; lesson: Lesson; step: LessonStep }
  | { kind: 'safety-stop'; reason: SafetyReason; matched: string }
  | { kind: 'unknown' }

/** On-device model identifier. */
export type ModelId = 'ocr' | 'whisper' | 'florence' | 'translate' | 'tts'

export type VoiceSource = 'pregen' | 'mms' | 'browser' | 'none'

export interface VoiceService {
  /** Speak Urdu text. `id` = phrase/step key used to find a pre-generated clip. */
  speak(text: string, opts?: { id?: string; rate?: number }): Promise<void>
  stop(): void
  source(id?: string): Promise<VoiceSource>
}

export interface TranslateService {
  toUrdu(text: string): Promise<string>
}

export interface CaptureService {
  /** Must be called inside a user gesture. Returns the first image on the clipboard or null. */
  readClipboardImage(): Promise<Blob | null>
  /** True when the app was opened by the Back-Tap Shortcut (?from=shortcut). */
  isShortcutLaunch(): boolean
  /** Removes ?from=shortcut from the URL (history.replaceState). */
  consumeShortcutParam(): void
  /** Calls cb when the app becomes visible/focused again; returns unsubscribe. */
  onReturn(cb: () => void): () => void
}

export interface ModelManager {
  warmUp(models: ModelId[]): Promise<void>
  status(): Record<ModelId, LoadProgress>
  onProgress(cb: (e: LoadProgress) => void): () => void
  device(): 'webgpu' | 'wasm'
}

/** Vision grounding hook signature used by the engine. */
export type VisionHook = (
  img: Blob,
  phrase: string,
  near?: [number, number]
) => Promise<Target | null>

/** Model download and initialisation progress. */
export interface LoadProgress {
  model: ModelId
  status: 'idle' | 'downloading' | 'ready' | 'error'
  progress: number
  message?: string
}

/** Type of learning telemetry event. */
export type LearnEventType = 'lesson' | 'pass' | 'hint' | 'replay' | 'done'

/** Learning event logged to measure scaffolding and retention. */
export interface LearnEvent {
  task: TaskId
  type: LearnEventType
  level: FadeLevel
  at: number
}

/** Progress and scaffolding metrics for a single task. */
export interface SkillProgress {
  task: TaskId
  level: FadeLevel
  timesPracticed: number
  timesPassed: number
  hintsInARow: number
  lastPracticed: number
  stuck: boolean
}

/** Overall learning progress summary for Ammi's dashboard and family sync. */
export interface ProgressSummary {
  skills: SkillProgress[]
  learnedCount: number
  weeklyCompleted: number
  callsSavedThisWeek: number
}

/** Primary engine interface for screenshot analysis and step verification. */
export interface Engine {
  analyze(input: {
    image: Blob
    task: TaskId
    redactions: RedactRect[]
    lessonId?: string
  }): Promise<AnalyzeResult>
  check(input: { image: Blob; lessonId: string; redactions?: RedactRect[] }): Promise<CheckResult>
  warmUp(models?: ModelId[]): Promise<void>
  onProgress(cb: (e: LoadProgress) => void): () => void
}

/** Speech-to-text service interface for voice queries. */
export interface SpeechService {
  transcribe(audio: Blob): Promise<{ text: string; task: TaskId | null; confidence: number }>
}

/** Offline IndexedDB storage service for lessons and telemetry. */
export interface LibraryService {
  list(): Promise<Lesson[]>
  get(id: string): Promise<Lesson | undefined>
  save(lesson: Lesson): Promise<void>
  remove(id: string): Promise<void>
  clear(): Promise<void>
  logEvent(e: LearnEvent): Promise<void>
  progress(): Promise<ProgressSummary>
  skill(task: TaskId): Promise<SkillProgress>
}

/** Native web share integration for sharing images and progress cards. */
export interface ShareService {
  shareImage(blob: Blob, text: string): Promise<'shared' | 'unsupported' | 'cancelled'>
}

export interface ElderSkillShare {
  task: TaskId
  level: FadeLevel
  stuck: boolean
  lastPracticed: number
}

export interface ElderProgressDoc {
  elderId: string
  name: string
  skills: ElderSkillShare[]
  learnedCount: number
  weeklyCompleted: number
  callsSavedThisWeek: number
  updatedAt: number
}

export interface FamilyUser {
  uid: string
  name: string | null
  isAnonymous: boolean
}

export type JoinResult =
  | { ok: true; familyId: string; elderName: string }
  | { ok: false; error: 'invalid' | 'expired' | 'offline' | 'unavailable' }

export interface FamilyService {
  available(): boolean
  onAuth(cb: (u: FamilyUser | null) => void): () => void
  currentUser(): FamilyUser | null
  // helper (child) side
  signInWithGoogle(): Promise<FamilyUser | null>
  signOut(): Promise<void>
  ensureFamily(): Promise<{ familyId: string }>
  createInvite(
    familyId: string,
    elderName: string,
  ): Promise<{ code: string; expiresAt: number; url: string }>
  watchElders(familyId: string, cb: (elders: ElderProgressDoc[]) => void): () => void
  // elder side
  joinWithCode(code: string): Promise<JoinResult>
  linkedFamily(): { familyId: string; elderName: string } | null
  sharing(): boolean
  setSharing(on: boolean): Promise<void>
  pushProgress(summary: ProgressSummary): Promise<void>
  unlinkAndDelete(): Promise<void>
}

export interface MetricsService {
  time<T>(
    name: 'ocr' | 'vision' | 'whisper' | 'tts' | 'translate' | 'analyze' | 'check',
    fn: () => Promise<T>,
  ): Promise<T>
  snapshot(): { name: string; count: number; avgMs: number; lastMs: number }[]
}

