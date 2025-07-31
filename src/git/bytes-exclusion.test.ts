import { describe, it, expect, vi } from 'vitest'
import type { CommitData } from './parser.js'
import { TEST_CONFIG } from '../test/test-config.js'

// Mock simple-git
vi.mock('simple-git', () => ({
  simpleGit: () => ({
    show: vi.fn().mockImplementation((args: string[]) => {
      const path = args[0]?.split(':')[1]
      if (path?.includes('bigfile.dat')) {
        return Array(1000).fill('line').join('\n')
      }
      if (path?.includes('smallfile.txt')) {
        return Array(100).fill('line').join('\n')
      }
      return ''
    }),
    raw: vi.fn().mockImplementation((args: string[]) => {
      // Mock cat-file -s for getting file sizes
      if (args[0] === 'cat-file' && args[1] === '-s') {
        const path = args[2]?.split(':')[1]
        if (path?.includes('bigfile.dat')) {
          return '50000' // 1000 lines * 50 bytes per line estimate
        }
        if (path?.includes('smallfile.txt')) {
          return '5000' // 100 lines * 50 bytes per line estimate
        }
      }
      return '0'
    })
  })
}))

// Import after mocking
import { applyCumulativeExclusions } from './cumulative-exclusion.js'

describe('Byte tracking for file movements to excluded directories', () => {
  it('should drop bytes when files move to excluded directories', async () => {
    const commits: CommitData[] = [
      {
        sha: 'abc123',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        date: '2025-07-01T10:00:00Z',
        message: 'Add files',
        linesAdded: 1100,
        linesDeleted: 0,
        bytesAdded: 55000,
        bytesDeleted: 0,
        filesChanged: [
          {
            fileName: 'src/bigfile.dat',
            linesAdded: 1000,
            linesDeleted: 0,
            fileType: 'Other',
            bytesAdded: 50000,
            bytesDeleted: 0
          },
          {
            fileName: 'src/smallfile.txt',
            linesAdded: 100,
            linesDeleted: 0,
            fileType: 'Text',
            bytesAdded: 5000,
            bytesDeleted: 0
          }
        ]
      },
      {
        sha: 'def456',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        date: '2025-07-02T10:00:00Z',
        message: 'Move files to docs',
        linesAdded: 0,
        linesDeleted: 0,
        bytesAdded: 0,
        bytesDeleted: 0,
        filesChanged: [
          {
            fileName: 'src/bigfile.dat => docs/bigfile.dat',
            linesAdded: 0,
            linesDeleted: 0,
            fileType: 'Other',
            bytesAdded: 0,
            bytesDeleted: 0
          },
          {
            fileName: 'src/smallfile.txt => docs/smallfile.txt',
            linesAdded: 0,
            linesDeleted: 0,
            fileType: 'Text',
            bytesAdded: 0,
            bytesDeleted: 0
          }
        ]
      }
    ]
    
    const adjustedCommits = await applyCumulativeExclusions('/fake/repo', commits, TEST_CONFIG)
    
    // First commit should be unchanged
    expect(adjustedCommits[0]!.bytesAdded).toBe(55000)
    expect(adjustedCommits[0]!.bytesDeleted).toBe(0)
    
    // Second commit should show bytes being deleted when moving to docs
    expect(adjustedCommits[1]!.bytesAdded).toBe(0)
    expect(adjustedCommits[1]!.bytesDeleted).toBe(55000) // Should subtract all bytes
    expect(adjustedCommits[1]!.linesAdded).toBe(0)
    expect(adjustedCommits[1]!.linesDeleted).toBe(1100) // Should subtract all lines
  })

  it('should handle compact rename format for bytes', async () => {
    const commits: CommitData[] = [
      {
        sha: 'abc123',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        date: '2025-07-01T10:00:00Z',
        message: 'Add files',
        linesAdded: 1100,
        linesDeleted: 0,
        bytesAdded: 55000,
        bytesDeleted: 0,
        filesChanged: [
          {
            fileName: 'examples/bigfile.dat',
            linesAdded: 1000,
            linesDeleted: 0,
            fileType: 'Other',
            bytesAdded: 50000,
            bytesDeleted: 0
          },
          {
            fileName: 'examples/smallfile.txt',
            linesAdded: 100,
            linesDeleted: 0,
            fileType: 'Text',
            bytesAdded: 5000,
            bytesDeleted: 0
          }
        ]
      },
      {
        sha: 'def456',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        date: '2025-07-02T10:00:00Z',
        message: 'Move examples to docs',
        linesAdded: 0,
        linesDeleted: 0,
        bytesAdded: 0,
        bytesDeleted: 0,
        filesChanged: [
          {
            fileName: '{examples => docs}/bigfile.dat',
            linesAdded: 0,
            linesDeleted: 0,
            fileType: 'Other',
            bytesAdded: 0,
            bytesDeleted: 0
          },
          {
            fileName: '{examples => docs}/smallfile.txt',
            linesAdded: 0,
            linesDeleted: 0,
            fileType: 'Text',
            bytesAdded: 0,
            bytesDeleted: 0
          }
        ]
      }
    ]
    
    const adjustedCommits = await applyCumulativeExclusions('/fake/repo', commits, TEST_CONFIG)
    
    // Verify bytes are subtracted with compact rename format
    expect(adjustedCommits[1]!.bytesAdded).toBe(0)
    expect(adjustedCommits[1]!.bytesDeleted).toBe(55000)
    expect(adjustedCommits[1]!.linesDeleted).toBe(1100)
  })

  it('should add bytes back when files move from excluded to included dirs', async () => {
    const commits: CommitData[] = [
      {
        sha: 'abc123',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        date: '2025-07-01T10:00:00Z',
        message: 'Add files to docs',
        linesAdded: 0,
        linesDeleted: 0,
        bytesAdded: 0,
        bytesDeleted: 0,
        filesChanged: [
          {
            fileName: 'docs/bigfile.dat',
            linesAdded: 0,
            linesDeleted: 0,
            fileType: 'Other',
            bytesAdded: 0,
            bytesDeleted: 0
          }
        ]
      },
      {
        sha: 'def456',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
        date: '2025-07-02T10:00:00Z',
        message: 'Move file back to src',
        linesAdded: 0,
        linesDeleted: 0,
        bytesAdded: 0,
        bytesDeleted: 0,
        filesChanged: [
          {
            fileName: 'docs/bigfile.dat => src/bigfile.dat',
            linesAdded: 0,
            linesDeleted: 0,
            fileType: 'Other',
            bytesAdded: 0,
            bytesDeleted: 0
          }
        ]
      }
    ]
    
    const adjustedCommits = await applyCumulativeExclusions('/fake/repo', commits, TEST_CONFIG)
    
    // Second commit should show bytes being added when moving from docs
    expect(adjustedCommits[1]!.bytesAdded).toBe(50000)
    expect(adjustedCommits[1]!.bytesDeleted).toBe(0)
    expect(adjustedCommits[1]!.linesAdded).toBe(1000)
    expect(adjustedCommits[1]!.linesDeleted).toBe(0)
  })
})