import { describe, it, expect, vi } from 'vitest'
import type { CommitData } from './parser.js'
import { TEST_CONFIG } from '../test/test-config.js'

// Mock simple-git
vi.mock('simple-git', () => ({
  simpleGit: () => ({
    show: vi.fn().mockImplementation((args: string[]) => {
      const path = args[0]?.split(':')[1]
      if (path?.includes('index.html')) {
        return Array(50).fill('line').join('\n')
      }
      if (path?.includes('file1.js') || path?.includes('file2.js')) {
        return Array(30).fill('line').join('\n')
      }
      return ''
    }),
    raw: vi.fn().mockImplementation((args: string[]) => {
      // Mock cat-file -s for getting file sizes
      if (args[0] === 'cat-file' && args[1] === '-s') {
        const path = args[2]?.split(':')[1]
        if (path?.includes('index.html')) {
          return '2500' // 50 lines * 50 bytes per line estimate
        }
        if (path?.includes('file1.js') || path?.includes('file2.js')) {
          return '1500' // 30 lines * 50 bytes per line estimate
        }
      }
      return '0'
    })
  })
}))

// Import after mocking
import { applyCumulativeExclusions } from './cumulative-exclusion.js'

describe('Compact rename format handling', () => {
  it('should handle compact rename format {old => new}/path', async () => {
    // Mock commits with compact rename format
    const commits: CommitData[] = [
      {
        sha: 'abc123',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        date: '2025-07-01T10:00:00Z',
        message: 'Add files to examples',
        linesAdded: 100,
        linesDeleted: 0,
        filesChanged: [
          {
            fileName: 'examples/index.html',
            linesAdded: 50,
            linesDeleted: 0,
            fileType: 'HTML'
          },
          {
            fileName: 'examples/repo-statter/index.html',
            linesAdded: 50,
            linesDeleted: 0,
            fileType: 'HTML'
          }
        ]
      },
      {
        sha: 'def456',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        date: '2025-07-02T10:00:00Z',
        message: 'Move files from examples to docs',
        linesAdded: 0,
        linesDeleted: 0,
        filesChanged: [
          {
            fileName: '{examples => docs}/index.html',
            linesAdded: 0,
            linesDeleted: 0,
            fileType: 'HTML'
          },
          {
            fileName: '{examples => docs}/repo-statter/index.html',
            linesAdded: 0,
            linesDeleted: 0,
            fileType: 'HTML'
          }
        ]
      }
    ]
    
    // Apply cumulative exclusions
    const adjustedCommits = await applyCumulativeExclusions('/fake/repo', commits, TEST_CONFIG)
    
    // First commit should be unchanged
    expect(adjustedCommits[0]!.linesAdded).toBe(100)
    expect(adjustedCommits[0]!.linesDeleted).toBe(0)
    
    // Second commit should subtract lines and bytes when moving to docs
    expect(adjustedCommits[1]!.linesAdded).toBe(0)
    expect(adjustedCommits[1]!.linesDeleted).toBe(100) // Should subtract the 100 lines
    expect(adjustedCommits[1]!.bytesAdded).toBe(0)
    expect(adjustedCommits[1]!.bytesDeleted).toBe(5000) // Should subtract 2500 + 2500 bytes
    expect(adjustedCommits[1]!.filesChanged).toHaveLength(2)
    
    // Verify the file changes show the deletions
    expect(adjustedCommits[1]!.filesChanged[0]!.linesDeleted).toBe(50)
    expect(adjustedCommits[1]!.filesChanged[0]!.bytesDeleted).toBe(2500)
    expect(adjustedCommits[1]!.filesChanged[1]!.linesDeleted).toBe(50)
    expect(adjustedCommits[1]!.filesChanged[1]!.bytesDeleted).toBe(2500)
  })
  
  it('should handle mixed rename formats in the same commit', async () => {
    const commits: CommitData[] = [
      {
        sha: 'abc123',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        date: '2025-07-01T10:00:00Z',
        message: 'Add files',
        linesAdded: 60,
        linesDeleted: 0,
        filesChanged: [
          {
            fileName: 'examples/file1.js',
            linesAdded: 30,
            linesDeleted: 0,
            fileType: 'JavaScript'
          },
          {
            fileName: 'src/file2.js',
            linesAdded: 30,
            linesDeleted: 0,
            fileType: 'JavaScript'
          }
        ]
      },
      {
        sha: 'def456',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        date: '2025-07-02T10:00:00Z',
        message: 'Move files around',
        linesAdded: 0,
        linesDeleted: 0,
        filesChanged: [
          {
            fileName: '{examples => docs}/file1.js', // Compact format
            linesAdded: 0,
            linesDeleted: 0,
            fileType: 'JavaScript'
          },
          {
            fileName: 'src/file2.js => docs/file2.js', // Standard format
            linesAdded: 0,
            linesDeleted: 0,
            fileType: 'JavaScript'
          }
        ]
      }
    ]
    
    const adjustedCommits = await applyCumulativeExclusions('/fake/repo', commits, TEST_CONFIG)
    
    // Both files should be subtracted when moving to docs
    expect(adjustedCommits[1]!.linesDeleted).toBe(60)
    expect(adjustedCommits[1]!.bytesDeleted).toBe(3000) // 1500 + 1500 bytes
    expect(adjustedCommits[1]!.filesChanged).toHaveLength(2)
  })
})