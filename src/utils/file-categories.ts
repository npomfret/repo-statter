import { getFileType, isBinaryFile } from '../data/git-extractor.js'
import type { RepoStatterConfig } from '../config/schema.js'

export type FileCategory = 'Application' | 'Test' | 'Build' | 'Documentation' | 'Other'

export function getFileCategory(filePath: string, config: RepoStatterConfig): FileCategory {
  // Binary files don't have meaningful line counts
  if (isBinaryFile(filePath, config)) {
    return 'Other' // Binary files will be excluded from line counts
  }
  
  // Use existing file type detection logic
  const fileType = getFileType(filePath, config)
  
  // Special handling for test files - check file path patterns first
  const isTestFile = config.fileCategories.testPatterns.some(pattern => 
    filePath.includes(pattern)
  )
  if (isTestFile) {
    return 'Test'
  }
  
  // Map file types to categories using configuration
  return config.fileCategories.categoryMappings[fileType] || 'Other'
}