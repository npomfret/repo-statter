#!/usr/bin/env node
import { build } from 'esbuild'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const srcDir = join(__dirname, '../src')
const distDir = join(__dirname, '../dist')

try {
  const result = await build({
    entryPoints: [join(srcDir, 'visualization/charts.ts')],
    bundle: true,
    format: 'iife',
    globalName: 'Charts',
    outfile: join(distDir, 'charts-bundle.js'),
    platform: 'browser',
    target: 'es2020',
    minify: false,
    sourcemap: false,
    external: ['ApexCharts', 'd3'],
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  })
  
  if (result.errors.length > 0) {
    console.error('Bundle errors:', result.errors)
    process.exit(1)
  }
  
  console.log('Charts script bundled successfully')
} catch (error) {
  console.error('Bundle failed:', error)
  process.exit(1)
}