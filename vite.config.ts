import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { voiceApiPlugin } from './server/viteVoicePlugin'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    voiceApiPlugin(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/assets/logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/logo-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/assets/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            files: [{ name: 'image', accept: ['image/*'] }],
          },
        },
      },
      injectManifest: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globIgnores: ['**/*.wasm'],
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
    pool: 'threads',
  },
})
