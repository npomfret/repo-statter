import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StreamingGitParser } from './streaming-parser'
import { Readable } from 'stream'

describe('StreamingGitParser', () => {
  let parser: StreamingGitParser

  beforeEach(() => {
    parser = new StreamingGitParser({ maxCommits: 10 })
  })

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const defaultParser = new StreamingGitParser()
      expect(defaultParser).toBeInstanceOf(StreamingGitParser)
    })

    it('should accept maxCommits option', () => {
      const limitedParser = new StreamingGitParser({ maxCommits: 5 })
      expect(limitedParser).toBeInstanceOf(StreamingGitParser)
    })
  })

  describe('parseLine', () => {
    it('should parse commit SHA', async () => {
      const gitLog = `commit abc123def456
Author: John Doe <john@example.com>
Date: 2024-01-01

    Initial commit
`
      const commits: any[] = []
      const readable = Readable.from([gitLog])
      
      await new Promise((resolve, reject) => {
        readable
          .pipe(parser)
          .on('data', (commit) => commits.push(commit))
          .on('end', resolve)
          .on('error', reject)
      })

      expect(commits).toHaveLength(1)
      expect(commits[0].sha).toBe('abc123def456')
      expect(commits[0].author).toBe('John Doe')
      expect(commits[0].email).toBe('john@example.com')
    })

    it('should handle multiple commits', async () => {
      const gitLog = `commit abc123
Author: John Doe <john@example.com>
Date: 2024-01-01

    First commit

commit def456
Author: Jane Smith <jane@example.com>
Date: 2024-01-02

    Second commit
`
      const commits: any[] = []
      const readable = Readable.from([gitLog])
      
      await new Promise((resolve, reject) => {
        readable
          .pipe(parser)
          .on('data', (commit) => commits.push(commit))
          .on('end', resolve)
          .on('error', reject)
      })

      expect(commits).toHaveLength(2)
      expect(commits[0].sha).toBe('abc123')
      expect(commits[1].sha).toBe('def456')
    })

    it('should respect maxCommits limit', async () => {
      const limitedParser = new StreamingGitParser({ maxCommits: 1 })
      const gitLog = `commit abc123
Author: John Doe <john@example.com>
Date: 2024-01-01

    First commit

commit def456
Author: Jane Smith <jane@example.com>
Date: 2024-01-02

    Second commit
`
      const commits: any[] = []
      const readable = Readable.from([gitLog])
      
      await new Promise((resolve, reject) => {
        readable
          .pipe(limitedParser)
          .on('data', (commit) => commits.push(commit))
          .on('end', resolve)
          .on('error', reject)
      })

      expect(commits).toHaveLength(1)
      expect(commits[0].sha).toBe('abc123')
    })
  })

  describe('progress events', () => {
    it('should emit progress events', async () => {
      const progressSpy = vi.fn()
      parser.on('progress', progressSpy)

      const gitLog = `commit abc123
Author: John Doe <john@example.com>
Date: 2024-01-01

    Commit message
`
      const readable = Readable.from([gitLog])
      const commits: any[] = []
      
      await new Promise<void>((resolve, reject) => {
        readable
          .pipe(parser)
          .on('data', (commit) => commits.push(commit))
          .on('end', () => resolve())
          .on('error', reject)
      })

      expect(progressSpy).toHaveBeenCalled()
      expect(progressSpy).toHaveBeenCalledWith({
        processed: 1,
        total: 1,
        percentage: 100,
        complete: true
      })
    })
  })

  describe('error handling', () => {
    it('should handle incomplete commits gracefully', async () => {
      const gitLog = `commit abc123
Author: John Doe`
      
      const commits: any[] = []
      const readable = Readable.from([gitLog])
      
      await new Promise((resolve, reject) => {
        readable
          .pipe(parser)
          .on('data', (commit) => commits.push(commit))
          .on('end', resolve)
          .on('error', reject)
      })

      // Incomplete commit should not be emitted
      expect(commits).toHaveLength(0)
    })
  })
})