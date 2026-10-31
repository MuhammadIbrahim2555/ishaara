// LAN testing on real phones: HTTPS (self-signed) so mic, clipboard and crypto.randomUUID work.
import { defineConfig, mergeConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import base from './vite.config'

export default mergeConfig(
  base,
  defineConfig({
    plugins: [basicSsl()],
    server: { host: true, port: 5443, strictPort: true },
  }),
)
