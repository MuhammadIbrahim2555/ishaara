import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import { handleVoice } from './geminiVoice'

const MAX_BODY_BYTES = 1.5 * 1024 * 1024 // 1.5 MB

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

export function voiceApiPlugin(): Plugin {
  let mode = 'development'

  return {
    name: 'vite-plugin-voice-api',
    configResolved(config) {
      mode = config.mode
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''
        if (url !== '/api/voice') {
          return next()
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'method-not-allowed' }))
          return
        }

        try {
          const chunks: Buffer[] = []
          let totalBytes = 0
          let tooLarge = false

          for await (const chunk of req) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            totalBytes += buf.length
            if (totalBytes > MAX_BODY_BYTES) {
              tooLarge = true
              break
            }
            chunks.push(buf)
          }

          if (tooLarge) {
            res.statusCode = 413
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'payload-too-large' }))
            return
          }

          const body = Buffer.concat(chunks)
          const contentType = req.headers['content-type'] || ''
          // Socket address only: x-forwarded-for is client-controlled and must not be trusted.
          const clientIp = req.socket?.remoteAddress || '127.0.0.1'

          const env = loadEnv(mode, process.cwd(), '')

          const result = await handleVoice({
            body,
            contentType,
            clientIp,
            origin: headerValue(req.headers.origin),
            host: headerValue(req.headers.host),
            secFetchSite: headerValue(req.headers['sec-fetch-site']),
            env,
          })

          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.json))
        } catch {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'internal-server-error' }))
        }
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''
        if (url !== '/api/voice') {
          return next()
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'method-not-allowed' }))
          return
        }

        try {
          const chunks: Buffer[] = []
          let totalBytes = 0
          let tooLarge = false

          for await (const chunk of req) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            totalBytes += buf.length
            if (totalBytes > MAX_BODY_BYTES) {
              tooLarge = true
              break
            }
            chunks.push(buf)
          }

          if (tooLarge) {
            res.statusCode = 413
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'payload-too-large' }))
            return
          }

          const body = Buffer.concat(chunks)
          const contentType = req.headers['content-type'] || ''
          // Socket address only: x-forwarded-for is client-controlled and must not be trusted.
          const clientIp = req.socket?.remoteAddress || '127.0.0.1'

          const env = loadEnv(mode, process.cwd(), '')

          const result = await handleVoice({
            body,
            contentType,
            clientIp,
            origin: headerValue(req.headers.origin),
            host: headerValue(req.headers.host),
            secFetchSite: headerValue(req.headers['sec-fetch-site']),
            env,
          })

          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.json))
        } catch {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'internal-server-error' }))
        }
      })
    },
  }
}
