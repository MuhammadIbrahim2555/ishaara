import type { IncomingMessage, ServerResponse } from 'http'
// ESM on Vercel's Node runtime needs the explicit .js extension (resolves to geminiVoice.ts at build).
import { handleVoice } from '../server/geminiVoice.js'

const MAX_BODY_BYTES = 1.5 * 1024 * 1024 // 1.5 MB

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

export const config = {
  api: {
    bodyParser: false,
  },
}

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

export default async function handler(
  req: IncomingMessage,
  res: VercelResponse,
): Promise<void> {
  const sendJson = (status: number, data: unknown) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      res.status(status).json(data)
    } else {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
    }
  }

  if (req.method !== 'POST') {
    sendJson(405, { error: 'method-not-allowed' })
    return
  }

  try {
    const chunks: Buffer[] = []
    let totalBytes = 0
    let tooLarge = false

    const anyReq = req as unknown as { body?: unknown }
    if (Buffer.isBuffer(anyReq.body)) {
      if (anyReq.body.length > MAX_BODY_BYTES) {
        tooLarge = true
      } else {
        chunks.push(anyReq.body)
      }
    } else if (anyReq.body instanceof Uint8Array) {
      if (anyReq.body.byteLength > MAX_BODY_BYTES) {
        tooLarge = true
      } else {
        chunks.push(Buffer.from(anyReq.body))
      }
    } else {
      for await (const chunk of req) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        totalBytes += buf.length
        if (totalBytes > MAX_BODY_BYTES) {
          tooLarge = true
          break
        }
        chunks.push(buf)
      }
    }

    if (tooLarge) {
      sendJson(413, { error: 'payload-too-large' })
      return
    }

    const body = Buffer.concat(chunks)
    const contentType = req.headers['content-type'] || ''
    // Never the first x-forwarded-for value (client-controlled).
    const clientIp =
      headerValue(req.headers['x-vercel-forwarded-for']) ||
      headerValue(req.headers['x-real-ip']) ||
      req.socket?.remoteAddress ||
      '127.0.0.1'

    const result = await handleVoice({
      body,
      contentType,
      clientIp,
      origin: headerValue(req.headers.origin),
      host: headerValue(req.headers.host),
      secFetchSite: headerValue(req.headers['sec-fetch-site']),
      env: process.env,
    })

    sendJson(result.status, result.json)
  } catch {
    sendJson(500, { error: 'internal-server-error' })
  }
}
