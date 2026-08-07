import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` (the production container's serve command — see
  // frontend/Dockerfile) rejects unrecognized Host headers by default.
  // The VPS's system Nginx proxies these domains to this container, so
  // their Host header must be explicitly allowed here.
  preview: {
    allowedHosts: ['harmonyfusion.yoga', 'www.harmonyfusion.yoga'],
  },
})
