import { build } from 'esbuild'
import { writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { BuildError, formatError } from '../utils/errors.js'

export async function bundlePageScript(): Promise<string> {
  const entryPoint = 'src/chart/page-script.ts'
  const outputFile = 'dist/page-script.js'
  
  if (!existsSync(entryPoint)) {
    throw new BuildError(`Entry point not found: ${entryPoint}`)
  }
  
  try {
    const result = await build({
      entryPoints: [entryPoint],
      bundle: true,
      format: 'iife',
      globalName: 'PageScript',
      outfile: outputFile,
      platform: 'browser',
      target: 'es2020',
      minify: false,
      sourcemap: false,
      external: ['ApexCharts', 'd3'],
      define: {
        'process.env.NODE_ENV': '"production"'
      },
      write: false
    })
    
    if (result.errors.length > 0) {
      throw new BuildError(`Build errors: ${result.errors.map(e => e.text).join(', ')}`)
    }
    
    const bundledCode = result.outputFiles[0]?.text || ''
    
    // Wrap the bundle to make it work with our template injection
    const wrappedCode = `
(function() {
  // Make ApexCharts and d3 available to the bundle
  window.ApexCharts = window.ApexCharts || {};
  window.d3 = window.d3 || {};
  
  ${bundledCode}
  
  // Export the initialization function to global scope
  window.initializePageScript = PageScript.initializePageScript;
})();
`
    
    await writeFile(outputFile, wrappedCode)
    
    return wrappedCode
  } catch (error) {
    if (error instanceof BuildError) {
      throw error
    }
    throw new BuildError('Build failed', error instanceof Error ? error : undefined)
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  bundlePageScript()
    .then(() => {})
    .catch(error => {
      // Build script error logging - this is acceptable for build-time debugging
      console.error('Bundle failed:', formatError(error))
      process.exit(1)
    })
}