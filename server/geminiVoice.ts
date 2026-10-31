export interface VoiceInput {
  body: Uint8Array
  contentType: string
  clientIp: string
  origin?: string
  host?: string
  secFetchSite?: string
  env: {
    GEMINI_API_KEY?: string
    GEMINI_MODEL?: string
    GEMINI_FALLBACK_MODELS?: string
    GEMINI_DAILY_CAP?: string
  }
}

export interface VoiceResult {
  transcript: string
  task: 'photo' | 'video_call' | 'voice_note' | 'send_money' | null
  replyUr: string
  replyEn: string
  confidence: number
  model: string
}

const ALLOWED_TASKS = new Set<string>(['photo', 'video_call', 'voice_note', 'send_money'])
const MAX_BODY_BYTES = 1.5 * 1024 * 1024 // 1.5 MB
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 20
const ATTEMPT_TIMEOUT_MS = 12_000 // per model attempt (audio + JSON can take ~6 s under load)
const OVERALL_BUDGET_MS = 25_000 // across all attempts

const DEFAULT_MODEL = 'gemini-3.8-flash'
const DEFAULT_FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite']
// HTTP statuses that move on to the next model. Any other failure status stops (bad request / bad key).
const FALLBACK_STATUSES = new Set([404, 429, 500, 502, 503, 504])

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_DAILY_CAP = 300 // global Gemini requests per rolling 24 h, across all IPs

// In-memory rate limit table: clientIp -> array of timestamps
const rateLimitMap = new Map<string, number[]>()
// Global rolling-24h log of requests that reached Gemini (sorted ascending)
const dailyRequests: number[] = []

export function _resetRateLimit(): void {
  rateLimitMap.clear()
  dailyRequests.length = 0
}

function resolveDailyCap(raw: string | undefined): number {
  const n = Number.parseInt((raw ?? '').trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_CAP
}

// Cross-origin / cross-site guard. Browsers send Sec-Fetch-Site and Origin on
// POST requests; a same-app request must match its own Host.
function isForbiddenOrigin(input: VoiceInput): boolean {
  const site = input.secFetchSite?.trim().toLowerCase()
  if (site && site !== 'same-origin' && site !== 'none') return true

  const origin = input.origin?.trim()
  if (origin) {
    let originHost: string
    try {
      originHost = new URL(origin).host.toLowerCase()
    } catch {
      return true
    }
    const host = input.host?.trim().toLowerCase()
    if (!host || originHost !== host) return true
  }
  return false
}

// Whole-token safety check (avoids matching words such as اپنا / اپنی / اپنے that contain پن).
const SAFETY_TOKENS = new Set(['otp', 'pin', 'mpin', 'password', 'passcode', 'پن', 'پاس', 'پاسورڈ'])
// Multi-word phrases, matched as whole consecutive tokens.
const SAFETY_PHRASES: string[][] = [
  ['او', 'ٹی', 'پی'],
  ['پاس', 'ورڈ'],
  ['خفیہ', 'کوڈ'],
  ['ایم', 'پن'],
]
const TOKEN_SPLIT = /[\s،۔؟!.,?:;"'()]+/

function isSafetySensitive(text: string): boolean {
  const tokens = text
    .split(TOKEN_SPLIT)
    .filter((t) => t.length > 0)
    .map((t) => t.toLowerCase())
  for (let i = 0; i < tokens.length; i++) {
    if (SAFETY_TOKENS.has(tokens[i])) return true
    for (const phrase of SAFETY_PHRASES) {
      if (phrase.every((word, offset) => tokens[i + offset] === word)) return true
    }
  }
  return false
}

function resolveModelChain(env: VoiceInput['env']): string[] {
  const primary = env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  const configured = (env.GEMINI_FALLBACK_MODELS ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m.length > 0)
  const fallbacks = configured.length > 0 ? configured : DEFAULT_FALLBACK_MODELS
  return [...new Set([primary, ...fallbacks])]
}

const PROMPT = `You are a voice assistant tutor for an older Pakistani user of a phone-learning app ("Ishaara").
The speaker may speak Urdu, Punjabi, or Roman-Urdu mixed with English.
Your task:
1. Transcribe the speech accurately in its original script (Urdu script for Urdu/Punjabi, Latin script for English/Roman Urdu).
2. Identify which of the 4 supported tasks the user wants to learn or perform:
   - "photo" (taking/sending photos, camera, تصویر)
   - "video_call" (video call, ویڈیو کال)
   - "voice_note" (voice message/audio note, آواز کا پیغام، وائس میسج)
   - "send_money" (sending money, JazzCash, EasyPaisa, پیسے بھیجنا)
   If the intent is unclear, not one of these 4 tasks, or if the user mentions OTP, PIN, password, or security codes, set task to null.
3. If the user mentions OTP, PIN, or password: set task to null, and write a calm warning in replyUr and replyEn never to share codes or passwords with anyone.
4. If not a security warning: write a warm, respectful reply in Urdu (replyUr, using respectful "آپ", <= 20 words) explaining simply what we will do next (e.g. "ٹھیک ہے، میں آپ کو تصویر بھیجنا سکھاتی ہوں"), and write the equivalent in simple English (replyEn). Never give advice about money transfers beyond choosing the task.
5. Provide a confidence score between 0.0 and 1.0.`

type AttemptResult =
  | { ok: true; parsed: Record<string, unknown> }
  | { ok: false; retry: boolean }

async function callModel(
  model: string,
  apiKey: string,
  requestBody: unknown,
  timeoutMs: number,
): Promise<AttemptResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    if (!res.ok) {
      return { ok: false, retry: FALLBACK_STATUSES.has(res.status) }
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>
        }
      }>
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) {
      return { ok: false, retry: true }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return { ok: false, retry: true }
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, retry: true }
    }
    return { ok: true, parsed: parsed as Record<string, unknown> }
  } catch {
    // Timeout (abort) or network failure: try the next model.
    return { ok: false, retry: true }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function handleVoice(
  input: VoiceInput,
): Promise<{ status: number; json: unknown }> {
  // 0. Origin / site check (before any quota is spent)
  if (isForbiddenOrigin(input)) {
    return { status: 403, json: { error: 'forbidden-origin' } }
  }

  // 1. API key check
  const apiKey = input.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return { status: 503, json: { error: 'not-configured' } }
  }

  // 2. Content-Type validation
  const rawContentType = input.contentType ? input.contentType.trim().toLowerCase() : ''
  const mimeType = rawContentType.split(';')[0].trim()
  if (!mimeType.startsWith('audio/')) {
    return { status: 415, json: { error: 'unsupported-media-type' } }
  }

  // 3. Body size validation
  if (!input.body || input.body.length > MAX_BODY_BYTES) {
    return { status: 413, json: { error: 'payload-too-large' } }
  }

  // 4. In-memory rate limiting (20 requests per 5 minutes per IP)
  const now = Date.now()
  const ip = input.clientIp || 'unknown'
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => t > windowStart)
  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitMap.set(ip, timestamps)
    return { status: 429, json: { error: 'rate-limited' } }
  }

  // 4b. Global daily cap across all IPs (rolling 24 h)
  const dayStart = now - DAY_MS
  while (dailyRequests.length > 0 && dailyRequests[0] <= dayStart) {
    dailyRequests.shift()
  }
  if (dailyRequests.length >= resolveDailyCap(input.env.GEMINI_DAILY_CAP)) {
    rateLimitMap.set(ip, timestamps)
    return { status: 429, json: { error: 'daily-cap' } }
  }

  timestamps.push(now)
  rateLimitMap.set(ip, timestamps)
  dailyRequests.push(now)

  // Clean up stale IPs in rateLimitMap if large
  if (rateLimitMap.size > 1000) {
    for (const [key, list] of rateLimitMap.entries()) {
      const active = list.filter((t) => t > windowStart)
      if (active.length === 0) {
        rateLimitMap.delete(key)
      } else {
        rateLimitMap.set(key, active)
      }
    }
  }

  // 5. Call Gemini API with model fallback
  const models = resolveModelChain(input.env)
  const deadline = now + OVERALL_BUDGET_MS

  const base64Data = Buffer.from(input.body).toString('base64')

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
          {
            text: PROMPT,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: 'application/json',
      response_schema: {
        type: 'OBJECT',
        properties: {
          transcript: { type: 'STRING' },
          task: { type: 'STRING', nullable: true },
          replyUr: { type: 'STRING' },
          replyEn: { type: 'STRING' },
          confidence: { type: 'NUMBER' },
        },
        required: ['transcript', 'replyUr', 'replyEn', 'confidence'],
      },
    },
  }

  for (const model of models) {
    const remaining = deadline - Date.now()
    const attempt = await callModel(
      model,
      apiKey,
      requestBody,
      Math.min(ATTEMPT_TIMEOUT_MS, remaining),
    )

    if (attempt.ok) {
      return { status: 200, json: buildResult(attempt.parsed, model) }
    }
    if (Date.now() >= deadline) {
      return { status: 504, json: { error: 'gateway-timeout' } }
    }
    if (!attempt.retry) {
      return { status: 502, json: { error: 'upstream' } }
    }
  }

  return { status: 502, json: { error: 'upstream' } }
}

function buildResult(parsed: Record<string, unknown>, model: string): VoiceResult {
  const transcript = typeof parsed.transcript === 'string' ? parsed.transcript.trim() : ''
  let task: VoiceResult['task'] =
    typeof parsed.task === 'string' && ALLOWED_TASKS.has(parsed.task)
      ? (parsed.task as VoiceResult['task'])
      : null

  let replyUr = typeof parsed.replyUr === 'string' ? parsed.replyUr.trim() : ''
  let replyEn = typeof parsed.replyEn === 'string' ? parsed.replyEn.trim() : ''

  // Safety guard: if OTP / PIN / password mentioned, task must be null
  if (isSafetySensitive(transcript) || isSafetySensitive(String(parsed.task || ''))) {
    task = null
    if (!replyUr) {
      replyUr = 'خبردار: کبھی بھی اپنا پن یا کوڈ کسی کے ساتھ شیئر نہ کریں۔'
    }
    if (!replyEn) {
      replyEn = 'Warning: Never share your PIN, OTP, or passwords with anyone.'
    }
  }

  const rawConf = Number(parsed.confidence)
  const confidence = Number.isFinite(rawConf) ? Math.max(0, Math.min(1, rawConf)) : 0

  return { transcript, task, replyUr, replyEn, confidence, model }
}
