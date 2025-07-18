import { getFileType, isBinaryFile } from '../data/git-extractor.js'

export type FileCategory = 'Application' | 'Test' | 'Build' | 'Documentation' | 'Other'

export function getFileCategory(filePath: string): FileCategory {
  // Binary files don't have meaningful line counts
  if (isBinaryFile(filePath)) {
    return 'Other' // Binary files will be excluded from line counts
  }
  
  // Use existing file type detection logic
  const fileType = getFileType(filePath)
  
  // Special handling for test files - check file path patterns first
  if (filePath.includes('.test.') || filePath.includes('.spec.') || 
      filePath.includes('/test/') || filePath.includes('/tests/') ||
      filePath.includes('/__tests__/') || filePath.includes('test/') ||
      filePath.includes('tests/') || filePath.includes('__tests__/')) {
    return 'Test'
  }
  
  // Map file types to categories
  const categoryMap: Record<string, FileCategory> = {
    'TypeScript': 'Application',
    'JavaScript': 'Application',
    'Python': 'Application',
    'Java': 'Application',
    'C++': 'Application',
    'C': 'Application',
    'Go': 'Application',
    'Rust': 'Application',
    'PHP': 'Application',
    'Ruby': 'Application',
    'Swift': 'Application',
    'Kotlin': 'Application',
    'Scala': 'Application',
    'R': 'Application',
    'Lua': 'Application',
    'Perl': 'Application',
    'CSS': 'Application',
    'SCSS': 'Application',
    'HTML': 'Application',
    'SQL': 'Application',
    'JSON': 'Build',
    'YAML': 'Build',
    'XML': 'Build',
    'Shell': 'Build',
    'PowerShell': 'Build',
    'Batch': 'Build',
    'Dockerfile': 'Build',
    'Makefile': 'Build',
    'Git': 'Build',
    'TOML': 'Build',
    'INI': 'Build',
    'Config': 'Build',
    'Properties': 'Build',
    'Environment': 'Build',
    'Gradle': 'Build',
    'VimScript': 'Build',
    'Markdown': 'Documentation',
    'Binary': 'Other' // Should not reach here due to early return
  }
  
  return categoryMap[fileType] || 'Other'
}