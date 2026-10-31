import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ishaara',
        short_name: 'Ishaara',
        description: 'Aap ki apni screen par, aap ki zubaan mein — phone seekhein.',
        lang: 'ur',
        dir: 'auto' as 'ltr' | 'rtl',
        theme_color: '#0F5257',
        background_color: '#FBF7F0',
        display: 'standalone',
        icons: [],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globIgnores: ['**/*.wasm'],
        runtimeCaching: [
          {
            urlPattern: /huggingface\.co|cdn\.jsdelivr\.net|tessdata/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ishaara-models',
              expiration: {
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ishaara-runtime',
              expiration: {
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /\/voice\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ishaara-voice',
              expiration: {
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname ?? '.', './src'),
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
})
