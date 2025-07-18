import { describe, it, expect } from 'vitest'
import { parseLsTreeOutput, calculateByteChanges, parseCommitHistory } from './parser.js'
import { isFileExcluded } from '../utils/exclusions.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

describe('parseLsTreeOutput', () => {
  it('should parse valid git ls-tree output', () => {
    const input = `100644 blob abc123def456 123 src/file1.ts
100644 blob def456ghi789 456 src/file2.js
100644 blob ghi789jkl012 789 README.md`
    
    const result = parseLsTreeOutput(input)
    
    expect(result).toEqual({
      'src/file1.ts': 123,
      'src/file2.js': 456,
      'README.md': 789
    })
  })

  it('should handle empty input', () => {
    const result = parseLsTreeOutput('')
    expect(result).toEqual({})
  })

  it('should handle whitespace-only input', () => {
    const result = parseLsTreeOutput('   \n  \n  ')
    expect(result).toEqual({})
  })

  it('should ignore non-blob entries', () => {
    const input = `040000 tree abc123def456       - src
100644 blob def456ghi789     123 src/file.ts
120000 link ghi789jkl012      15 symlink`
    
    const result = parseLsTreeOutput(input)
    
    expect(result).toEqual({
      'src/file.ts': 123
    })
  })

  it('should handle malformed lines', () => {
    const input = `100644 blob abc123def456 123 src/file1.ts
invalid line format
100644 blob def456ghi789 456 src/file2.js
another invalid line`
    
    const result = parseLsTreeOutput(input)
    
    expect(result).toEqual({
      'src/file1.ts': 123,
      'src/file2.js': 456
    })
  })

  it('should handle files with spaces in names', () => {
    const input = `100644 blob abc123def456 123 src/file with spaces.ts
100644 blob def456ghi789 456 "quoted file.js"`
    
    const result = parseLsTreeOutput(input)
    
    expect(result).toEqual({
      'src/file with spaces.ts': 123,
      '"quoted file.js"': 456
    })
  })

  it('should handle zero-byte files', () => {
    const input = `100644 blob abc123def456 0 empty.txt
100644 blob def456ghi789 123 normal.txt`
    
    const result = parseLsTreeOutput(input)
    
    expect(result).toEqual({
      'empty.txt': 0,
      'normal.txt': 123
    })
  })

  it('should handle invalid size values', () => {
    const input = `100644 blob abc123def456 abc src/file1.ts
100644 blob def456ghi789 123 src/file2.js`
    
    const result = parseLsTreeOutput(input)
    
    // Lines with non-numeric size values don't match the regex and are filtered out
    expect(result).toEqual({
      'src/file2.js': 123
    })
  })
})

describe('calculateByteChanges', () => {
  const currentSizes = `100644 blob abc123 200 file1.txt
100644 blob def456 300 file2.txt
100644 blob ghi789 400 file3.txt`

  const parentSizes = `100644 blob abc123 150 file1.txt
100644 blob def456 300 file2.txt
100644 blob jkl012 250 file4.txt`

  it('should calculate bytes for added files', () => {
    const changedFiles = `A\tfile3.txt`
    
    const result = calculateByteChanges(currentSizes, parentSizes, changedFiles)
    
    expect(result).toEqual({
      totalBytesAdded: 400,
      totalBytesDeleted: 0,
      fileChanges: {
        'file3.txt': { bytesAdded: 400, bytesDeleted: 0 }
      }
    })
  })

  it('should calculate bytes for deleted files', () => {
    const changedFiles = `D\tfile4.txt`
    
    const result = calculateByteChanges(currentSizes, parentSizes, changedFiles)
    
    expect(result).toEqual({
      totalBytesAdded: 0,
      totalBytesDeleted: 250,
      fileChanges: {
        'file4.txt': { bytesAdded: 0, bytesDeleted: 250 }
      }
    })
  })

  it('should calculate bytes for modified files with increase', () => {
    const changedFiles = `M\tfile1.txt`
    
    const result = calculateByteChanges(currentSizes, parentSizes, changedFiles)
    
    expect(result).toEqual({
      totalBytesAdded: 50,
      totalBytesDeleted: 0,
      fileChanges: {
        'file1.txt': { bytesAdded: 50, bytesDeleted: 0 }
      }
    })
  })

  it('should calculate bytes for modified files with decrease', () => {
    const modifiedCurrentSizes = `100644 blob abc123 100 file1.txt`
    const changedFiles = `M\tfile1.txt`
    
    const result = calculateByteChanges(modifiedCurrentSizes, parentSizes, changedFiles)
    
    expect(result).toEqual({
      totalBytesAdded: 0,
      totalBytesDeleted: 50,
      fileChanges: {
        'file1.txt': { bytesAdded: 0, bytesDeleted: 50 }
      }
    })
  })

  it('should handle multiple file changes', () => {
    const changedFiles = `A\tfile3.txt
D\tfile4.txt
M\tfile1.txt`
    
    const result = calculateByteChanges(currentSizes, parentSizes, changedFiles)
    
    expect(result).toEqual({
      totalBytesAdded: 450,
      totalBytesDeleted: 250,
      fileChanges: {
        'file3.txt': { bytesAdded: 400, bytesDeleted: 0 },
        'file4.txt': { bytesAdded: 0, bytesDeleted: 250 },
        'file1.txt': { bytesAdded: 50, bytesDeleted: 0 }
      }
    })
  })

  it('should skip excluded files', () => {
    const changedFiles = `A\tnode_modules/package.json
A\t.git/config
A\tvalid-file.txt`
    
    const validCurrentSizes = `100644 blob abc123 100 valid-file.txt
100644 blob def456 200 node_modules/package.json
100644 blob ghi789 50 .git/config`
    
    const result = calculateByteChanges(validCurrentSizes, '', changedFiles)
    
    // Should exclude node_modules and .git files
    expect(result).toEqual({
      totalBytesAdded: 100,
      totalBytesDeleted: 0,
      fileChanges: {
        'valid-file.txt': { bytesAdded: 100, bytesDeleted: 0 }
      }
    })
  })

  it('should handle files with tabs in names', () => {
    const changedFiles = `A\tfile\twith\ttabs.txt`
    const tabCurrentSizes = `100644 blob abc123 100 file\twith\ttabs.txt`
    
    const result = calculateByteChanges(tabCurrentSizes, '', changedFiles)
    
    expect(result).toEqual({
      totalBytesAdded: 100,
      totalBytesDeleted: 0,
      fileChanges: {
        'file\twith\ttabs.txt': { bytesAdded: 100, bytesDeleted: 0 }
      }
    })
  })

  it('should handle empty change lists', () => {
    const result = calculateByteChanges(currentSizes, parentSizes, '')
    
    expect(result).toEqual({
      totalBytesAdded: 0,
      totalBytesDeleted: 0,
      fileChanges: {}
    })
  })

  it('should handle missing files in size maps', () => {
    const changedFiles = `A\tmissing-file.txt
D\tanother-missing.txt
M\tfile1.txt`
    
    const result = calculateByteChanges(currentSizes, parentSizes, changedFiles)
    
    expect(result).toEqual({
      totalBytesAdded: 50,
      totalBytesDeleted: 0,
      fileChanges: {
        'file1.txt': { bytesAdded: 50, bytesDeleted: 0 }
      }
    })
  })
})

describe('byte calculation integration test', () => {
  it('should calculate cumulative byte changes that match actual repository size', async () => {
    const testRepoPath = process.env['TEST_REPO_PATH'] || path.join(process.cwd(), 'test-repo')
    
    // Skip test if test repo doesn't exist
    if (!existsSync(testRepoPath)) {
      console.log('Skipping integration test: test repository not found at', testRepoPath)
      return
    }
    
    // Get all commit history with byte changes
    const commits = await parseCommitHistory(testRepoPath)
    
    // Calculate cumulative bytes from all commits
    let cumulativeBytes = 0
    for (const commit of commits) {
      const bytesAdded = commit.bytesAdded || 0
      const bytesDeleted = commit.bytesDeleted || 0
      cumulativeBytes += (bytesAdded - bytesDeleted)
    }
    
    // Get actual total size of all files in the final commit
    const { stdout } = await execAsync(`cd "${testRepoPath}" && git ls-tree -r -l HEAD`)
    const actualTotalSize = parseLsTreeOutput(stdout)
    
    // Sum up only non-excluded file sizes (same logic as the byte calculation)
    const actualRepoSize = Object.entries(actualTotalSize)
      .filter(([file]) => !isFileExcluded(file))
      .reduce((sum, [, size]) => sum + size, 0)
    
    // The cumulative byte changes should match the actual repository size
    expect(cumulativeBytes).toBe(actualRepoSize)
  }, 10000) // 10 second timeout for git operations
})