import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { BuildError } from '../utils/errors.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function bundlePageScript(): Promise<string> {
  // Use pre-bundled page script from build process
  const projectRoot = join(__dirname, '../../')
  const bundleFile = join(projectRoot, 'dist/page-script-bundle.js')
  
  if (!existsSync(bundleFile)) {
    throw new BuildError(`Pre-bundled page script not found: ${bundleFile}. Run 'npm run build' first.`)
  }
  
  try {
    const bundledCode = await readFile(bundleFile, 'utf-8')
    
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
    throw new BuildError('Failed to load pre-bundled page script', error instanceof Error ? error : undefined)
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  bundlePageScript()
    .then(() => {})
    .catch(error => {
      // Build script error logging - this is acceptable for build-time debugging
      console.error('Bundle failed:', error)
      process.exit(1)
    })
}