import { Minimatch } from 'minimatch'

const DEFAULT_EXCLUSION_PATTERNS = [
  // Images
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.png',
  '**/*.gif',
  '**/*.svg',
  '**/*.bmp',
  '**/*.webp',
  
  // Documents
  '**/*.md',
  '**/*.pdf',
  '**/*.doc',
  '**/*.docx',
  '**/*.xls',
  '**/*.xlsx',
  
  // Lock files
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/composer.lock',
  '**/Cargo.lock',
  '**/poetry.lock',
  '**/Pipfile.lock',
  '**/Gemfile.lock',
  
  // Build & dependency directories
  '**/node_modules/**/*',
  '**/dist/**/*',
  '**/build/**/*',
  '**/target/**/*',
  '**/vendor/**/*',
  '**/coverage/**/*',
  '**/test-results/**/*',
  '**/reports/**/*',
  '**/out/**/*',
  '**/bin/**/*',
  '**/obj/**/*',
  
  // Git files
  '.git/**/*',
  '**/.gitignore',
  '**/.gitattributes',
  
  // Environment files
  '**/.env',
  '**/.env.*',
  
  // IDE and editor files
  '**/.vscode/**/*',
  '**/.idea/**/*',
  '**/.*.swp',
  '**/.*.swo',
  '**/*~',
  
  // System files
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/*.log',
  '**/*.tmp',
  '**/*.cache',
  
  // Language-specific artifacts
  '**/__pycache__/**/*',
  '**/*.pyc',
  '**/*.pyo',
  '**/*.class',
  '**/*.jar',
  '**/*.war',
  '**/*.ear'
]

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

export function getDefaultExclusionPatterns(): string[] {
  return [...DEFAULT_EXCLUSION_PATTERNS]
}