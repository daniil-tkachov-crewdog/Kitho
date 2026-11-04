import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const shared = fileURLToPath(new URL('../shared/src', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@kitho/shared': shared } },
  server: { fs: { allow: ['..'] } },
})
