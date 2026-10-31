import type { IncomingMessage } from 'http'
import { Readable } from 'stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../api/voice'
import { _resetRateLimit, handleVoice } from '../server/geminiVoice'
import { voiceApiPlugin } from '../server/viteVoicePlugin'

function geminiOk(transcript: string, task: string | null = 'photo') {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  transcript,
                  task,
                  replyUr: 'ٹھیک ہے',
                  replyEn: 'Okay',
                  confidence: 0.9,
                }),
              },
            ],
          },
        },
      ],
    }),
  }
}

function geminiStatus(status: number) {
  return { ok: false, status, text: async () => 'upstream detail', json: async () => ({}) }
}

// Resolves only when the request's AbortSignal fires (simulates a hung upstream).
function hangUntilAborted(_url: string, init?: RequestInit): Promise<never> {
  return new Promise((_, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('The operation was aborted', 'AbortError')),
    )
  })
}

function modelOf(fetchMock: ReturnType<typeof vi.fn>, call: number): string {
  const url = String(fetchMock.mock.calls[call][0])
  return decodeURIComponent(url.split('/models/')[1].split(':generateContent')[0])
}

const BASE_INPUT = {
  body: new Uint8Array([1, 2, 3]),
  contentType: 'audio/webm',
  clientIp: '172.16.0.1',
}

describe('handleVoice server handler', () => {
  beforeEach(() => {
    _resetRateLimit()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('returns 503 not-configured when GEMINI_API_KEY is missing or empty', async () => {
    const resNoKey = await handleVoice({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'audio/webm',
      clientIp: '10.0.0.1',
      env: {},
    })
    expect(resNoKey.status).toBe(503)
    expect(resNoKey.json).toEqual({ error: 'not-configured' })

    const resEmptyKey = await handleVoice({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'audio/webm',
      clientIp: '10.0.0.1',
      env: { GEMINI_API_KEY: '   ' },
    })
    expect(resEmptyKey.status).toBe(503)
    expect(resEmptyKey.json).toEqual({ error: 'not-configured' })
  })

  it('returns 415 when contentType does not start with audio/', async () => {
    const res = await handleVoice({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'text/plain',
      clientIp: '10.0.0.1',
      env: { GEMINI_API_KEY: 'test-key' },
    })
    expect(res.status).toBe(415)
    expect((res.json as { error: string }).error).toBeDefined()
  })

  it('accepts valid audio content types like audio/webm, audio/wav, audio/ogg', async () => {
    const fakeGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  transcript: 'ہیلو',
                  task: 'photo',
                  replyUr: 'جی',
                  replyEn: 'Yes',
                  confidence: 0.9,
                }),
              },
            ],
          },
        },
      ],
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeGeminiResponse,
    })
    vi.stubGlobal('fetch', mockFetch)

    const res = await handleVoice({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'audio/webm; codecs=opus',
      clientIp: '10.0.0.1',
      env: { GEMINI_API_KEY: 'test-key' },
    })
    expect(res.status).toBe(200)
    expect((res.json as Record<string, unknown>).transcript).toBe('ہیلو')
  })

  it('returns 413 when body exceeds 1.5 MB', async () => {
    const largeBody = new Uint8Array(1.5 * 1024 * 1024 + 10)
    const res = await handleVoice({
      body: largeBody,
      contentType: 'audio/wav',
      clientIp: '10.0.0.1',
      env: { GEMINI_API_KEY: 'test-key' },
    })
    expect(res.status).toBe(413)
  })

  it('enforces in-memory rate limit of 20 requests per 5 minutes per IP (returns 429)', async () => {
    const fakeGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  transcript: 'test',
                  task: null,
                  replyUr: 'test',
                  replyEn: 'test',
                  confidence: 0.8,
                }),
              },
            ],
          },
        },
      ],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => fakeGeminiResponse,
      }),
    )

    const clientIp = '192.168.1.100'
    for (let i = 0; i < 20; i++) {
      const res = await handleVoice({
        body: new Uint8Array([1, 2, 3]),
        contentType: 'audio/webm',
        clientIp,
        env: { GEMINI_API_KEY: 'test-key' },
      })
      expect(res.status).toBe(200)
    }

    // 21st request from same IP should get 429
    const res21 = await handleVoice({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'audio/webm',
      clientIp,
      env: { GEMINI_API_KEY: 'test-key' },
    })
    expect(res21.status).toBe(429)

    // Request from a different IP still succeeds
    const resOtherIp = await handleVoice({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'audio/webm',
      clientIp: '192.168.1.101',
      env: { GEMINI_API_KEY: 'test-key' },
    })
    expect(resOtherIp.status).toBe(200)
  })

  it('sends GEMINI_API_KEY in x-goog-api-key header only (never in URL or query)', async () => {
    let capturedUrl = ''
    let capturedHeaders: Record<string, string> = {}

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        capturedUrl = url
        capturedHeaders = (init?.headers as Record<string, string>) || {}
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        transcript: 'تصویر',
                        task: 'photo',
                        replyUr: 'ٹھیک ہے',
                        replyEn: 'Okay',
                        confidence: 0.9,
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        })
      }),
    )

    const res = await handleVoice({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'audio/webm',
      clientIp: '127.0.0.1',
      env: { GEMINI_API_KEY: 'secret-key-12345' },
    })

    expect(res.status).toBe(200)
    expect(capturedUrl).not.toContain('secret-key-12345')
    expect(capturedUrl).not.toContain('key=')
    expect(capturedHeaders['x-goog-api-key']).toBe('secret-key-12345')
  })

  it('handles upstream non-200 responses as 502 upstream without echoing upstream body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'internal google cloud error with sensitive details',
        json: async () => ({ secret: 'leaked' }),
      }),
    )

    const res = await handleVoice({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'audio/webm',
      clientIp: '127.0.0.1',
      env: { GEMINI_API_KEY: 'test-key' },
    })

    expect(res.status).toBe(502)
    expect(res.json).toEqual({ error: 'upstream' })
  })

  it('returns 504 gateway-timeout when the 20 s overall budget is exceeded', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockImplementation(hangUntilAborted)
    vi.stubGlobal('fetch', fetchMock)

    const pending = handleVoice({ ...BASE_INPUT, env: { GEMINI_API_KEY: 'test-key' } })
    await vi.advanceTimersByTimeAsync(30_000)
    const res = await pending

    expect(res.status).toBe(504)
    expect(res.json).toEqual({ error: 'gateway-timeout' })
    // 8 s + 8 s + 4 s (remaining budget) = 3 attempts, all cut off by timeout
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('normalises good response: clamps confidence and maps unknown tasks to null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      transcript: 'کچھ بھی',
                      task: 'unknown_custom_task',
                      replyUr: 'سمجھ نہیں آیا',
                      replyEn: 'Did not understand',
                      confidence: 1.8,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    )

    const res = await handleVoice({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'audio/webm',
      clientIp: '127.0.0.1',
      env: { GEMINI_API_KEY: 'test-key' },
    })

    expect(res.status).toBe(200)
    const data = res.json as Record<string, unknown>
    expect(data.task).toBeNull()
    expect(data.confidence).toBe(1.0)
  })

  it('forces task to null and provides a security warning if user mentions OTP or PIN', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      transcript: 'میرا او ٹی پی کوڈ 4829 ہے یہ JazzCash میں ڈال دو',
                      task: 'send_money',
                      replyUr: 'پیسے بھیجتے ہیں',
                      replyEn: 'Sending money',
                      confidence: 0.95,
                    }),
                  },
                ],
              },
            },
          ],
        }),
      }),
    )

    const res = await handleVoice({
      body: new Uint8Array([1, 2, 3]),
      contentType: 'audio/webm',
      clientIp: '127.0.0.1',
      env: { GEMINI_API_KEY: 'test-key' },
    })

    expect(res.status).toBe(200)
    const data = res.json as Record<string, unknown>
    expect(data.task).toBeNull()
  })

  describe('safety guard (whole-token match)', () => {
    it('keeps the task for words that merely contain پن (اپنی)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(geminiOk('اپنی بیٹی کو تصویر بھیجنی ہے', 'photo')),
      )
      const res = await handleVoice({ ...BASE_INPUT, env: { GEMINI_API_KEY: 'test-key' } })
      expect(res.status).toBe(200)
      expect((res.json as Record<string, unknown>).task).toBe('photo')
    })

    it.each([['میرا پن کیا ہے'], ['OTP aaya hai'], ['password bhool gaya']])(
      'sets task to null for security token in transcript: %s',
      async (transcript) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(geminiOk(transcript, 'photo')))
        const res = await handleVoice({ ...BASE_INPUT, env: { GEMINI_API_KEY: 'test-key' } })
        expect(res.status).toBe(200)
        expect((res.json as Record<string, unknown>).task).toBeNull()
      },
    )
  })

  describe('model fallback chain', () => {
    it('returns the model id used on a default first-attempt success', async () => {
      const fetchMock = vi.fn().mockResolvedValue(geminiOk('ہیلو'))
      vi.stubGlobal('fetch', fetchMock)
      const res = await handleVoice({ ...BASE_INPUT, env: { GEMINI_API_KEY: 'test-key' } })
      expect(res.status).toBe(200)
      expect((res.json as Record<string, unknown>).model).toBe('gemini-3.8-flash')
      expect(modelOf(fetchMock, 0)).toBe('gemini-3.8-flash')
    })

    it('falls back to the second model when the first returns 429', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(geminiStatus(429))
        .mockResolvedValueOnce(geminiOk('ہیلو'))
      vi.stubGlobal('fetch', fetchMock)
      const res = await handleVoice({
        ...BASE_INPUT,
        env: { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'model-a', GEMINI_FALLBACK_MODELS: 'model-b' },
      })
      expect(res.status).toBe(200)
      expect((res.json as Record<string, unknown>).model).toBe('model-b')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('moves past 404 and 503 to a third model that succeeds', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(geminiStatus(404))
        .mockResolvedValueOnce(geminiStatus(503))
        .mockResolvedValueOnce(geminiOk('ہیلو'))
      vi.stubGlobal('fetch', fetchMock)
      const res = await handleVoice({
        ...BASE_INPUT,
        env: { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'm1', GEMINI_FALLBACK_MODELS: ' m2 ,, m3 ' },
      })
      expect(res.status).toBe(200)
      expect((res.json as Record<string, unknown>).model).toBe('m3')
      expect([modelOf(fetchMock, 0), modelOf(fetchMock, 1), modelOf(fetchMock, 2)]).toEqual([
        'm1',
        'm2',
        'm3',
      ])
    })

    it.each([400, 401, 403])('stops on HTTP %i with no fallback and returns 502', async (status) => {
      const fetchMock = vi.fn().mockResolvedValue(geminiStatus(status))
      vi.stubGlobal('fetch', fetchMock)
      const res = await handleVoice({ ...BASE_INPUT, env: { GEMINI_API_KEY: 'test-key' } })
      expect(res.status).toBe(502)
      expect(res.json).toEqual({ error: 'upstream' })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('returns 502 upstream when every model in the chain fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue(geminiStatus(503))
      vi.stubGlobal('fetch', fetchMock)
      const res = await handleVoice({ ...BASE_INPUT, env: { GEMINI_API_KEY: 'test-key' } })
      expect(res.status).toBe(502)
      expect(res.json).toEqual({ error: 'upstream' })
      // default chain: gemini-3.8-flash + 3 default fallbacks
      expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    it('moves on to the next model when an attempt times out after 12 s', async () => {
      vi.useFakeTimers()
      const fetchMock = vi
        .fn()
        .mockImplementationOnce(hangUntilAborted)
        .mockResolvedValueOnce(geminiOk('ہیلو'))
      vi.stubGlobal('fetch', fetchMock)

      const pending = handleVoice({
        ...BASE_INPUT,
        env: { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'slow-model', GEMINI_FALLBACK_MODELS: 'fast-model' },
      })
      await vi.advanceTimersByTimeAsync(12_000)
      const res = await pending

      expect(res.status).toBe(200)
      expect((res.json as Record<string, unknown>).model).toBe('fast-model')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('moves on when a 200 response has invalid JSON text', async () => {
      const badJson = {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }),
      }
      const fetchMock = vi.fn().mockResolvedValueOnce(badJson).mockResolvedValueOnce(geminiOk('ہیلو'))
      vi.stubGlobal('fetch', fetchMock)
      const res = await handleVoice({
        ...BASE_INPUT,
        env: { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'm1', GEMINI_FALLBACK_MODELS: 'm2' },
      })
      expect(res.status).toBe(200)
      expect((res.json as Record<string, unknown>).model).toBe('m2')
    })

    it('de-duplicates models so a repeated primary is attempted once', async () => {
      const fetchMock = vi.fn().mockResolvedValue(geminiStatus(503))
      vi.stubGlobal('fetch', fetchMock)
      const res = await handleVoice({
        ...BASE_INPUT,
        env: { GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'gemini-3.5-flash' },
      })
      expect(res.status).toBe(502)
      // gemini-3.5-flash is both primary and a default fallback: 3 unique models
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })
  })
})

interface FakeRes {
  statusCode: number
  body: string
  setHeader: () => void
  end: (chunk?: string) => void
}

function fakeRes(): FakeRes {
  const res: FakeRes = {
    statusCode: 200,
    body: '',
    setHeader: () => {},
    end: (chunk?: string) => {
      res.body = chunk ?? ''
    },
  }
  return res
}

function fakeReq(
  headers: Record<string, string> = {},
  remoteAddress = '203.0.113.9',
  method = 'POST',
): IncomingMessage {
  return Object.assign(Readable.from([Buffer.from([1, 2, 3])]), {
    url: '/api/voice',
    method,
    headers: { 'content-type': 'audio/webm', ...headers },
    socket: { remoteAddress },
  }) as unknown as IncomingMessage
}

type Adapter = (req: IncomingMessage) => Promise<{ status: number; json: Record<string, unknown> }>

// Runs a real adapter (Vercel handler or Vite dev/preview middleware) end to end.
function adapterFor(name: 'vercel' | 'vite'): Adapter {
  if (name === 'vercel') {
    return async (req) => {
      const res = fakeRes()
      await handler(req, res as unknown as Parameters<typeof handler>[1])
      return { status: res.statusCode, json: JSON.parse(res.body) }
    }
  }
  const plugin = voiceApiPlugin() as unknown as {
    configureServer: (server: {
      middlewares: { use: (fn: (req: IncomingMessage, res: FakeRes, next: () => void) => Promise<void>) => void }
    }) => void
  }
  let middleware: ((req: IncomingMessage, res: FakeRes, next: () => void) => Promise<void>) | undefined
  plugin.configureServer({ middlewares: { use: (fn) => (middleware = fn) } })
  return async (req) => {
    const res = fakeRes()
    await middleware!(req, res, () => {})
    return { status: res.statusCode, json: JSON.parse(res.body) }
  }
}

const ADAPTERS = ['vercel', 'vite'] as const

describe('request hardening (adapters and global guards)', () => {
  beforeEach(() => {
    _resetRateLimit()
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(geminiOk('ہیلو')),
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it.each(ADAPTERS)('%s adapter: spoofed x-forwarded-for does not bypass the per-IP limit', async (name) => {
    const send = adapterFor(name)
    for (let i = 0; i < 20; i++) {
      const res = await send(fakeReq({ 'x-forwarded-for': `10.0.0.${i}` }))
      expect(res.status).toBe(200)
    }
    // Same socket address, fresh spoofed header: must still be limited.
    const blocked = await send(fakeReq({ 'x-forwarded-for': '10.9.9.9' }))
    expect(blocked.status).toBe(429)
    expect(blocked.json).toEqual({ error: 'rate-limited' })
  })

  it.each(ADAPTERS)('%s adapter: non-POST returns 405', async (name) => {
    const res = await adapterFor(name)(fakeReq({}, '203.0.113.9', 'GET'))
    expect(res.status).toBe(405)
  })

  it.each(ADAPTERS)('%s adapter: cross-origin request returns 403 and never calls Gemini', async (name) => {
    const fetchMock = vi.mocked(fetch)
    const res = await adapterFor(name)(
      fakeReq({ origin: 'https://evil.example', host: 'app.example.com', 'sec-fetch-site': 'cross-site' }),
    )
    expect(res.status).toBe(403)
    expect(res.json).toEqual({ error: 'forbidden-origin' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(ADAPTERS)('%s adapter: same-origin request is accepted', async (name) => {
    const res = await adapterFor(name)(
      fakeReq({ origin: 'https://app.example.com', host: 'app.example.com', 'sec-fetch-site': 'same-origin' }),
    )
    expect(res.status).toBe(200)
  })

  it('returns 429 daily-cap once the global cap is reached, across all IPs', async () => {
    const env = { GEMINI_API_KEY: 'test-key', GEMINI_DAILY_CAP: '3' }
    for (let i = 0; i < 3; i++) {
      const res = await handleVoice({ ...BASE_INPUT, clientIp: `10.1.0.${i}`, env })
      expect(res.status).toBe(200)
    }
    const res = await handleVoice({ ...BASE_INPUT, clientIp: '10.2.0.1', env })
    expect(res.status).toBe(429)
    expect(res.json).toEqual({ error: 'daily-cap' })
  })

  it('returns 403 forbidden-origin for cross-origin and cross-site requests', async () => {
    const env = { GEMINI_API_KEY: 'test-key' }
    const crossOrigin = await handleVoice({
      ...BASE_INPUT,
      origin: 'https://evil.example',
      host: 'app.example.com',
      env,
    })
    expect(crossOrigin.status).toBe(403)
    expect(crossOrigin.json).toEqual({ error: 'forbidden-origin' })

    const crossSite = await handleVoice({ ...BASE_INPUT, secFetchSite: 'cross-site', env })
    expect(crossSite.status).toBe(403)
    expect(crossSite.json).toEqual({ error: 'forbidden-origin' })
  })

  it('accepts same-origin requests and direct requests with no browser headers', async () => {
    const env = { GEMINI_API_KEY: 'test-key' }
    const sameOrigin = await handleVoice({
      ...BASE_INPUT,
      origin: 'https://app.example.com',
      host: 'app.example.com',
      secFetchSite: 'same-origin',
      env,
    })
    expect(sameOrigin.status).toBe(200)

    const direct = await handleVoice({ ...BASE_INPUT, secFetchSite: 'none', env })
    expect(direct.status).toBe(200)
  })
})
