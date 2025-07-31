import { simpleGit } from 'simple-git'
import { isFileExcluded } from '../utils/exclusions.js'
import type { CommitData, FileChange } from './parser.js'
import type { SimplifiedConfig } from '../config/simplified-schema.js'

/**
 * Apply cumulative exclusion logic to commits, handling file moves to/from excluded directories.
 * 
 * This function:
 * 1. Detects when files are moved between excluded/non-excluded directories
 * 2. Adjusts LOC counts when files cross exclusion boundaries
 * 3. Ensures edits in excluded directories are ignored
 */
export async function applyCumulativeExclusions(
  repoPath: string,
  commits: CommitData[],
  config: SimplifiedConfig
): Promise<CommitData[]> {
  
  const adjustedCommits: CommitData[] = []
  const git = simpleGit(repoPath)
  
  for (const commit of commits) {
    
    let adjustedLinesAdded = commit.linesAdded
    let adjustedLinesDeleted = commit.linesDeleted
    let adjustedBytesAdded = commit.bytesAdded ?? 0
    let adjustedBytesDeleted = commit.bytesDeleted ?? 0
    const adjustedFilesChanged: FileChange[] = []
    
    // Process each file change
    for (const fileChange of commit.filesChanged) {
      const fileName = fileChange.fileName
      
      // Check if this is a rename
      let oldPath: string | undefined
      let newPath: string | undefined
      
      // Standard format: "oldPath => newPath"
      if (fileName.includes(' => ')) {
        const parts = fileName.split(' => ').map(p => p.trim())
        if (parts.length === 2 && parts[0] && parts[1]) {
          [oldPath, newPath] = parts
        }
      }
      
      // Compact format: "{oldDir => newDir}/commonPath"
      const compactMatch = fileName.match(/^{(.+?)\s*=>\s*(.+?)}\/(.+)$/)
      if (compactMatch && compactMatch[1] && compactMatch[2] && compactMatch[3]) {
        const [, oldDir, newDir, commonPath] = compactMatch
        oldPath = `${oldDir}/${commonPath}`
        newPath = `${newDir}/${commonPath}`
      }
      
      if (oldPath && newPath) {
        const oldExcluded = isFileExcluded(oldPath, config.exclusions.patterns)
        const newExcluded = isFileExcluded(newPath, config.exclusions.patterns)
        
        
        // If file crosses exclusion boundary, we need to adjust LOC and bytes
        if (oldExcluded !== newExcluded) {
          // Get the file's line count and byte size from the parent commit (before the move)
          const lineCount = await getFileLineCount(git, `${commit.sha}^`, oldPath)
          const byteSize = await getFileByteSize(git, `${commit.sha}^`, oldPath)
          
          if (!oldExcluded && newExcluded) {
            // Moving from included to excluded: subtract lines and bytes
            adjustedLinesDeleted += lineCount
            adjustedBytesDeleted += byteSize
            
            // Create a synthetic file change entry for the deletion
            adjustedFilesChanged.push({
              fileName: fileName,
              linesAdded: 0,
              linesDeleted: lineCount,
              fileType: fileChange.fileType,
              bytesAdded: 0,
              bytesDeleted: byteSize
            })
          } else if (oldExcluded && !newExcluded) {
            // Moving from excluded to included: add lines and bytes
            adjustedLinesAdded += lineCount
            adjustedBytesAdded += byteSize
            
            // Create a synthetic file change entry for the addition
            adjustedFilesChanged.push({
              fileName: fileName,
              linesAdded: lineCount,
              linesDeleted: 0,
              fileType: fileChange.fileType,
              bytesAdded: byteSize,
              bytesDeleted: 0
            })
          }
        } else if (!oldExcluded && !newExcluded) {
          // Both paths are included, keep the change
          adjustedFilesChanged.push(fileChange)
        }
        // If both are excluded, ignore the change entirely
      } else {
        // Not a rename, check if file should be excluded
        if (!isFileExcluded(fileName, config.exclusions.patterns)) {
          adjustedFilesChanged.push(fileChange)
        } else {
          // File is excluded, remove its contributions
          adjustedLinesAdded -= fileChange.linesAdded
          adjustedLinesDeleted -= fileChange.linesDeleted
          adjustedBytesAdded -= fileChange.bytesAdded || 0
          adjustedBytesDeleted -= fileChange.bytesDeleted || 0
        }
      }
    }
    
    const adjustedCommit: CommitData = {
      ...commit,
      linesAdded: adjustedLinesAdded,
      linesDeleted: adjustedLinesDeleted,
      bytesAdded: adjustedBytesAdded,
      bytesDeleted: adjustedBytesDeleted,
      filesChanged: adjustedFilesChanged
    }
    
    adjustedCommits.push(adjustedCommit)
  }
  
  return adjustedCommits
}

/**
 * Get the line count of a file at a specific commit
 */
async function getFileLineCount(git: any, commitSha: string, filePath: string): Promise<number> {
  try {
    // Get the file contents at this commit
    const fileContent = await git.show([`${commitSha}:${filePath}`])
    // Count non-empty lines
    const lines = fileContent.split('\n').filter((line: string) => line.trim().length > 0)
    return lines.length
  } catch (error) {
    // If we can't get the file (e.g., it doesn't exist at this commit), return 0
    return 0
  }
}

/**
 * Get the byte size of a file at a specific commit
 */
async function getFileByteSize(git: any, commitSha: string, filePath: string): Promise<number> {
  try {
    // Get the size of the file blob
    const output = await git.raw(['cat-file', '-s', `${commitSha}:${filePath}`])
    return parseInt(output.trim()) || 0
  } catch (error) {
    // If we can't get the file size, return 0
    return 0
  }
}