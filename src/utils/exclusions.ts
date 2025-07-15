import { minimatch } from 'minimatch'

const DEFAULT_EXCLUSION_PATTERNS = [
  // Images
  '*.jpg',
  '*.jpeg',
  '*.png',
  '*.gif',
  '*.svg',
  '*.bmp',
  '*.webp',
  
  // Documents
  '*.md',
  '*.pdf',
  '*.doc',
  '*.docx',
  '*.xls',
  '*.xlsx',
  
  // Lock files
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.lock',
  
  // Build & dependency directories
  'node_modules/**/*',
  'dist/**/*',
  'build/**/*',
  'target/**/*',
  'vendor/**/*',
  
  // Git files
  '.git/**/*',
  '.gitignore',
  '.gitattributes',
  
  // Environment files
  '.env',
  '.env.*'
]

export function isFileExcluded(filePath: string, patterns: string[] = DEFAULT_EXCLUSION_PATTERNS): boolean {
  return patterns.some(pattern => minimatch(filePath, pattern))
}

export function getDefaultExclusionPatterns(): string[] {
  return [...DEFAULT_EXCLUSION_PATTERNS]
}