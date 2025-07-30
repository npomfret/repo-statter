import { Minimatch } from 'minimatch'
import { DEFAULT_CONFIG } from '../config/defaults.js'

const DEFAULT_EXCLUSION_PATTERNS = DEFAULT_CONFIG.exclusions.patterns

// Pre-compile all default patterns at module load time
const DEFAULT_COMPILED_PATTERNS = DEFAULT_EXCLUSION_PATTERNS.map(pattern => new Minimatch(pattern))

// Cache for custom patterns
const compiledPatterns = new Map<string, Minimatch>()

function getCompiledPattern(pattern: string): Minimatch {
  if (!compiledPatterns.has(pattern)) {
    compiledPatterns.set(pattern, new Minimatch(pattern))
  }
  return compiledPatterns.get(pattern)!
}

export function isFileExcluded(filePath: string, patterns: string[] = DEFAULT_EXCLUSION_PATTERNS): boolean {
  // Fast path for default patterns
  if (patterns === DEFAULT_EXCLUSION_PATTERNS) {
    return DEFAULT_COMPILED_PATTERNS.some(pattern => pattern.match(filePath))
  }
  
  // Cached path for custom patterns
  return patterns.some(pattern => {
    const compiled = getCompiledPattern(pattern)
    return compiled.match(filePath)
  })
}