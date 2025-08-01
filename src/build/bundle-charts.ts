import { build } from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { BuildError } from '../utils/errors.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function bundleCharts(): Promise<string> {
  try {
    const result = await build({
      entryPoints: [join(__dirname, '../visualization/charts.ts')],
      bundle: true,
      format: 'iife',
      globalName: 'Charts',
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
      throw new BuildError(`Failed to bundle charts: ${result.errors[0]?.text || 'Unknown error'}`)
    }

    const bundledCode = result.outputFiles?.[0]?.text
    if (!bundledCode) {
      throw new BuildError('No output from chart bundling')
    }
    
    // Wrap the bundle to make it work with our template injection
    const wrappedCode = `
(function() {
  ${bundledCode}
  
  // Export the render function to global scope
  window.renderAllCharts = Charts.renderAllCharts;
  window.updateGrowthChartAxis = Charts.updateGrowthChartAxis;
  window.updateCategoryChartAxis = Charts.updateCategoryChartAxis;
  window.updateUserChartAxis = Charts.updateUserChartAxis;
})();
`
    
    return wrappedCode
  } catch (error) {
    if (error instanceof BuildError) {
      throw error
    }
    throw new BuildError('Failed to bundle charts script', error instanceof Error ? error : undefined)
  }
}