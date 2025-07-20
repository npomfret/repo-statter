import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { isFileExcluded } from '../utils/exclusions.js'

const execAsync = promisify(exec)

export async function checkLizardInstalled(): Promise<boolean> {
  try {
    await execAsync('lizard --version')
    return true
  } catch {
    return false
  }
}

export async function analyzeRepositoryComplexity(repoPath: string): Promise<Map<string, number>> {
  const isInstalled = await checkLizardInstalled()
  if (!isInstalled) {
    console.warn('Lizard is not installed. Skipping complexity analysis.')
    console.warn('To enable complexity analysis, install lizard: pip install lizard')
    return new Map()
  }
  

  try {
    // Only analyze supported code files, exclude common non-code paths
    // Use --csv for easier parsing
    const { stdout } = await execAsync(`lizard "${repoPath}" -x "*/node_modules/*" -x "*/dist/*" -x "*/build/*" -x "*/.git/*" -x "*/coverage/*" --csv || true`, {
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large repos
    })

    const complexityMap = new Map<string, number>()
    const lines = stdout.split('\n')
    const fileComplexityMap = new Map<string, number>()

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line || !line.trim()) continue

      // CSV format: nloc,ccn,token,param,length,location,file,function,long_name,start,end
      const parts = line.split(',')
      if (parts.length < 7) continue

      const ccnStr = parts[1]
      let filePath = parts[6]
      
      if (ccnStr && filePath) {
        // Remove quotes if present
        filePath = filePath.replace(/^"/, '').replace(/"$/, '')
        
        const ccn = parseInt(ccnStr, 10)
        if (!isNaN(ccn)) {
          // Get the maximum complexity for each file
          const currentMax = fileComplexityMap.get(filePath) || 0
          fileComplexityMap.set(filePath, Math.max(currentMax, ccn))
        }
      }
    }

    // Convert to relative paths and filter
    for (const [filePath, complexity] of fileComplexityMap.entries()) {
      const relativeFile = filePath.replace(repoPath + '/', '').replace(/^\.\//, '')
      if (!isFileExcluded(relativeFile) && complexity > 0) {
        complexityMap.set(relativeFile, complexity)
      }
    }

    return complexityMap
  } catch (error) {
    console.warn('Failed to analyze repository complexity:', error)
    return new Map()
  }
}