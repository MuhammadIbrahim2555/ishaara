// LAN testing on real phones: HTTPS (self-signed) so mic, clipboard and crypto.randomUUID work.
import { defineConfig, mergeConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import base from './vite.config.ts'

export default mergeConfig(
  base,
  defineConfig({
    plugins: [basicSsl()],
    // Own dep cache so it doesn't fight the :5173 dev server over node_modules/.vite (caused 504 "Outdated Optimize Dep").
    cacheDir: 'node_modules/.vite-lan',
    server: { host: true, port: 5443, strictPort: true },
  }),
)
