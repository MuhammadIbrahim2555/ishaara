/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ revision: string | null; url: string }>
}

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Navigation fallback for SPA routes
try {
  const handler = createHandlerBoundToURL('/index.html')
  const navigationRoute = new NavigationRoute(handler, {
    denylist: [/^\/share-target/],
  })
  registerRoute(navigationRoute)
} catch {
  // Safe fallback if index.html is handled differently in dev
}

// Runtime caching: models (Hugging Face, jsDelivr, Tessdata)
registerRoute(
  /huggingface\.co|cdn\.jsdelivr\.net|tessdata/,
  new CacheFirst({
    cacheName: 'ishaara-models',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
)

// Runtime caching: WASM runtime
registerRoute(
  /\.wasm$/,
  new CacheFirst({
    cacheName: 'ishaara-runtime',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
)

// Runtime caching: voice audio files
registerRoute(
  /\/voice\//,
  new CacheFirst({
    cacheName: 'ishaara-voice',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
)

// Web Share Target: handle POST /share-target
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData()
          const file = formData.get('image')
          if (!file || typeof file === 'string') {
            return Response.redirect('/ask/photo', 303)
          }

          const cache = await caches.open('ishaara-share')
          const response = new Response(file, {
            headers: {
              'content-type': file.type || 'application/octet-stream',
            },
          })
          await cache.put('/shared/latest', response)
          return Response.redirect('/ask/photo?from=share', 303)
        } catch {
          return Response.redirect('/ask/photo', 303)
        }
      })(),
    )
  }
})
