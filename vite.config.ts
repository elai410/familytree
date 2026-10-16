import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // three.js is large on its own; one bundle is fine for this site.
  build: { chunkSizeWarningLimit: 1600 },
})
