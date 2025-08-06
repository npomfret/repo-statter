import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts',
        'apps/**'
      ]
    },
    include: ['packages/**/*.{test,spec}.{js,ts}'],
    watchExclude: ['**/node_modules/**', '**/dist/**']
  },
  resolve: {
    alias: {
      '@repo-statter/core': resolve(__dirname, './packages/core/src'),
      '@repo-statter/visualizations': resolve(__dirname, './packages/visualizations/src'),
      '@repo-statter/report-builder': resolve(__dirname, './packages/report-builder/src'),
      '@repo-statter/cli': resolve(__dirname, './packages/cli/src')
    }
  }
})