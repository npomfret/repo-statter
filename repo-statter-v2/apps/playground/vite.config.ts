import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: '/',
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext'
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})