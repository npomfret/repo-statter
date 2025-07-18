import { extname } from 'path'
import type { FileChange } from '../git/parser.js'
import { isFileExcluded } from '../utils/exclusions.js'
import { assert, assertDefined } from '../utils/errors.js'


const FILE_TYPE_MAP = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'SCSS',
  '.html': 'HTML',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.py': 'Python',
  '.java': 'Java',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.c': 'C',
  '.go': 'Go',
  '.rs': 'Rust',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.swift': 'Swift',
  '.kt': 'Kotlin'
} as const

export function getFileType(fileName: string): string {
  const ext = extname(fileName).toLowerCase()
  if (!ext) return 'Other'
  return FILE_TYPE_MAP[ext as keyof typeof FILE_TYPE_MAP] ?? ext
}

export interface ParsedCommitDiff {
  linesAdded: number
  linesDeleted: number
  bytesAdded: number
  bytesDeleted: number
  filesChanged: FileChange[]
}

export interface DiffSummaryFile {
  file: string
  insertions?: number
  deletions?: number
}

export interface DiffSummary {
  files: DiffSummaryFile[]
}

export interface ByteChanges {
  totalBytesAdded: number
  totalBytesDeleted: number
  fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }>
}

export function parseCommitDiff(
  diffSummary: DiffSummary,
  byteChanges: ByteChanges
): ParsedCommitDiff {
  assert(!!diffSummary, 'diffSummary must exist')
  assert(!!diffSummary.files, 'diffSummary must have files property')
  assert(Array.isArray(diffSummary.files), 'diffSummary.files must be an array')
  assert(!!byteChanges, 'byteChanges must exist')
  assert(!!byteChanges.fileChanges, 'byteChanges must have fileChanges property')
  
  const filesChanged: FileChange[] = diffSummary.files
    .filter(file => {
      assertDefined(file.file, 'file.file')
      return !isFileExcluded(file.file)
    })
    .map(file => ({
      fileName: file.file,
      linesAdded: 'insertions' in file ? file.insertions : 0,
      linesDeleted: 'deletions' in file ? file.deletions : 0,
      fileType: getFileType(file.file),
      bytesAdded: byteChanges.fileChanges[file.file]?.bytesAdded ?? 0,
      bytesDeleted: byteChanges.fileChanges[file.file]?.bytesDeleted ?? 0
    }))
  
  const linesAdded = filesChanged.reduce((sum, file) => sum + file.linesAdded, 0)
  const linesDeleted = filesChanged.reduce((sum, file) => sum + file.linesDeleted, 0)
  
  const bytesAdded = filesChanged.reduce((sum, file) => sum + (file.bytesAdded ?? 0), 0)
  const bytesDeleted = filesChanged.reduce((sum, file) => sum + (file.bytesDeleted ?? 0), 0)
  
  return { 
    linesAdded, 
    linesDeleted, 
    bytesAdded,
    bytesDeleted,
    filesChanged 
  }
}

export function parseByteChanges(gitNumstatOutput: string): ByteChanges {
  assert(typeof gitNumstatOutput === 'string', 'gitNumstatOutput must be a string')
  
  const fileChanges: Record<string, { bytesAdded: number; bytesDeleted: number }> = {}
  let totalBytesAdded = 0
  let totalBytesDeleted = 0
  
  const lines = gitNumstatOutput.trim().split('\n').filter(l => l.trim())
  
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length >= 3) {
      const addedStr = parts[0] ?? '0'
      const deletedStr = parts[1] ?? '0'
      
      // Skip binary files (indicated by '-' instead of numbers)
      if (addedStr === '-' || deletedStr === '-') {
        continue
      }
      
      const added = parseInt(addedStr)
      const deleted = parseInt(deletedStr)
      
      // Skip invalid numbers
      if (isNaN(added) || isNaN(deleted)) {
        continue
      }
      
      // For filenames with tabs, join remaining parts
      const fileName = parts.slice(2).join('\t')
      assertDefined(fileName, 'file name in numstat output')
      
      if (!isFileExcluded(fileName)) {
        // Rough estimate: 1 line ≈ 50 bytes (average line length)
        const bytesAdded = added * 50
        const bytesDeleted = deleted * 50
        
        fileChanges[fileName] = { bytesAdded, bytesDeleted }
        totalBytesAdded += bytesAdded
        totalBytesDeleted += bytesDeleted
      }
    }
  }
  
  return { totalBytesAdded, totalBytesDeleted, fileChanges }
}