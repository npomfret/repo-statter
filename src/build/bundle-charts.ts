import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { BuildError } from '../utils/errors.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function bundleCharts(): Promise<string> {
  // Use pre-bundled charts script from build process
  const projectRoot = join(__dirname, '../../')
  const bundleFile = join(projectRoot, 'dist/charts-bundle.js')
  
  if (!existsSync(bundleFile)) {
    throw new BuildError(`Pre-bundled charts script not found: ${bundleFile}. Run 'npm run build' first.`)
  }
  
  try {
    const bundledCode = await readFile(bundleFile, 'utf-8')
    
    // Wrap the bundle to make it work with our template injection
    const wrappedCode = `
(function() {
  ${bundledCode}
  
  // Export the render function to global scope
  window.renderAllCharts = Charts.renderAllCharts;
  window.updateCategoryChartAxis = Charts.updateCategoryChartAxis;
})();
`
    
    return wrappedCode
  } catch (error) {
    throw new BuildError('Failed to load pre-bundled charts script', error instanceof Error ? error : undefined)
  }
}