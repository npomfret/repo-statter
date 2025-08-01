import { build } from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { BuildError } from '../utils/errors.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function bundlePageScript(): Promise<string> {
  try {
    const result = await build({
      entryPoints: [join(__dirname, '../visualization/core/page-script.ts')],
      bundle: true,
      format: 'iife',
      globalName: 'PageScript',
      platform: 'browser',
      target: 'es2020',
      minify: false,
      write: false,
      external: ['ApexCharts', 'd3'],
      define: {
        'process.env.NODE_ENV': '"production"'
      }
    })

    if (result.errors.length > 0) {
      throw new BuildError(`Failed to bundle page script: ${result.errors[0]?.text || 'Unknown error'}`)
    }

    const bundledCode = result.outputFiles?.[0]?.text
    if (!bundledCode) {
      throw new BuildError('No output from page script bundling')
    }
    
    // Wrap the bundle to make it work with our template injection
    const wrappedCode = `
(function() {
  ${bundledCode}
  
  // Export the initialization function to global scope
  window.initializePageScript = PageScript.initializePageScript;
})();
`
    
    return wrappedCode
  } catch (error) {
    if (error instanceof BuildError) {
      throw error
    }
    throw new BuildError('Failed to bundle page script', error instanceof Error ? error : undefined)
  }
}