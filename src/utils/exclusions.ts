import { minimatch } from 'minimatch'

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

export function isFileExcluded(filePath: string, patterns: string[] = DEFAULT_EXCLUSION_PATTERNS): boolean {
  return patterns.some(pattern => minimatch(filePath, pattern))
}

export function getDefaultExclusionPatterns(): string[] {
  return [...DEFAULT_EXCLUSION_PATTERNS]
}