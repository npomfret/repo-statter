import { extname } from 'path'
import type { FileChange } from '../git/parser.js'
import { isFileExcluded } from '../utils/exclusions.js'
import { assert, assertDefined } from '../utils/errors.js'
import type { RepoStatterConfig } from '../config/schema.js'


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
  '.kt': 'Kotlin',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.xml': 'XML',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.zsh': 'Shell',
  '.fish': 'Shell',
  '.ps1': 'PowerShell',
  '.psm1': 'PowerShell',
  '.psd1': 'PowerShell',
  '.bat': 'Batch',
  '.cmd': 'Batch',
  '.dockerfile': 'Dockerfile',
  '.makefile': 'Makefile',
  '.mk': 'Makefile',
  '.gitignore': 'Git',
  '.gitattributes': 'Git',
  '.toml': 'TOML',
  '.ini': 'INI',
  '.cfg': 'Config',
  '.conf': 'Config',
  '.properties': 'Properties',
  '.env': 'Environment',
  '.sql': 'SQL',
  '.r': 'R',
  '.R': 'R',
  '.scala': 'Scala',
  '.gradle': 'Gradle',
  '.lua': 'Lua',
  '.vim': 'VimScript',
  '.pl': 'Perl',
  '.pm': 'Perl'
} as const

const BINARY_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.lib', '.a',
  '.class', '.jar', '.war', '.ear', '.pyc', '.pyo',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv',
  '.db', '.sqlite', '.sqlite3',
  '.bin', '.dat', '.img', '.iso'
])

export function getFileType(fileName: string): string {
  const ext = extname(fileName).toLowerCase()
  if (!ext) return 'Other'
  if (BINARY_EXTENSIONS.has(ext)) return 'Binary'
  return FILE_TYPE_MAP[ext as keyof typeof FILE_TYPE_MAP] ?? 'Other'
}

export function isBinaryFile(fileName: string): boolean {
  const ext = extname(fileName).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
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

export function parseByteChanges(gitNumstatOutput: string, config: RepoStatterConfig): ByteChanges {
  assert(typeof gitNumstatOutput === 'string', 'gitNumstatOutput must be a string')
  
  const bytesPerLineEstimate = config.analysis.bytesPerLineEstimate
  
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
        // Rough estimate: 1 line ≈ configured bytes (average line length)
        const bytesAdded = added * bytesPerLineEstimate
        const bytesDeleted = deleted * bytesPerLineEstimate
        
        fileChanges[fileName] = { bytesAdded, bytesDeleted }
        totalBytesAdded += bytesAdded
        totalBytesDeleted += bytesDeleted
      }
    }
  }
  
  return { totalBytesAdded, totalBytesDeleted, fileChanges }
}