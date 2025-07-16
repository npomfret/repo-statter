import { describe, it, expect } from 'vitest'
import { getLinearSeriesData } from './linear-transformer.js'
import { CommitDataBuilder, FileChangeBuilder } from '../test/builders.js'

describe('Linear Transformer', () => {
  describe('getLinearSeriesData', () => {
    it('should return empty array for no commits', () => {
      const result = getLinearSeriesData([])
      expect(result).toEqual([])
    })

    it('should handle single commit correctly', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('abc123')
          .withDate('2024-01-01T10:00:00Z')
          .withMessage('Initial commit')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('file.js')
              .withAdditions(50, 2500)
              .withDeletions(10, 500)
              .build()
          )
          .build()
      ]

      const result = getLinearSeriesData(commits)
      
      expect(result).toHaveLength(2)
      
      // Starting point
      expect(result[0]!).toEqual({
        commitIndex: 0,
        sha: 'start',
        date: '2024-01-01T10:00:00Z',
        cumulativeLines: 0,
        commits: 0,
        linesAdded: 0,
        linesDeleted: 0,
        netLines: 0,
        cumulativeBytes: 0
      })
      
      // First commit
      expect(result[1]!).toEqual({
        commitIndex: 1,
        sha: 'abc123',
        date: '2024-01-01T10:00:00Z',
        cumulativeLines: 40, // 50 - 10
        commits: 1,
        linesAdded: 50,
        linesDeleted: 10,
        netLines: 40,
        cumulativeBytes: 2000 // 2500 - 500
      })
    })

    it('should calculate cumulative values correctly across multiple commits', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('commit1')
          .withDate('2024-01-01T10:00:00Z')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('file1.js')
              .withAdditions(100, 5000)
              .withDeletions(20, 1000)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('commit2')
          .withDate('2024-01-01T11:00:00Z')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('file2.js')
              .withAdditions(50, 2500)
              .withDeletions(30, 1500)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('commit3')
          .withDate('2024-01-01T12:00:00Z')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('file3.js')
              .withAdditions(25, 1250)
              .withDeletions(75, 3750)
              .build()
          )
          .build()
      ]

      const result = getLinearSeriesData(commits)
      
      expect(result).toHaveLength(4) // Start + 3 commits
      
      // Verify cumulative calculations
      expect(result[0]!.cumulativeLines).toBe(0)
      expect(result[0]!.cumulativeBytes).toBe(0)
      
      expect(result[1]!.cumulativeLines).toBe(80) // 100 - 20
      expect(result[1]!.cumulativeBytes).toBe(4000) // 5000 - 1000
      
      expect(result[2]!.cumulativeLines).toBe(100) // 80 + 50 - 30
      expect(result[2]!.cumulativeBytes).toBe(5000) // 4000 + 2500 - 1500
      
      expect(result[3]!.cumulativeLines).toBe(50) // 100 + 25 - 75
      expect(result[3]!.cumulativeBytes).toBe(2500) // 5000 + 1250 - 3750
    })

    it('should maintain correct index progression', () => {
      const commits = [
        new CommitDataBuilder().withHash('a').build(),
        new CommitDataBuilder().withHash('b').build(),
        new CommitDataBuilder().withHash('c').build(),
        new CommitDataBuilder().withHash('d').build(),
        new CommitDataBuilder().withHash('e').build()
      ]

      const result = getLinearSeriesData(commits)
      
      expect(result).toHaveLength(6) // Start + 5 commits
      
      // Check index progression
      expect(result[0]!.commitIndex).toBe(0)
      expect(result[1]!.commitIndex).toBe(1)
      expect(result[2]!.commitIndex).toBe(2)
      expect(result[3]!.commitIndex).toBe(3)
      expect(result[4]!.commitIndex).toBe(4)
      expect(result[5]!.commitIndex).toBe(5)
      
      // Check SHAs
      expect(result[0]!.sha).toBe('start')
      expect(result[1]!.sha).toBe('a')
      expect(result[2]!.sha).toBe('b')
      expect(result[3]!.sha).toBe('c')
      expect(result[4]!.sha).toBe('d')
      expect(result[5]!.sha).toBe('e')
    })

    it('should handle commits without byte data', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('commit1')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('file1.js')
              .withAdditions(100) // No bytes specified
              .withDeletions(20)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('commit2')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('file2.js')
              .withAdditions(50, 2500)
              .withDeletions(30, 1500)
              .build()
          )
          .build()
      ]

      // Manually remove bytes properties for first commit to test null coalescing
      delete (commits[0]! as any).bytesAdded
      delete (commits[0]! as any).bytesDeleted

      const result = getLinearSeriesData(commits)
      
      expect(result).toHaveLength(3)
      
      // First commit should handle undefined bytes as 0
      expect(result[1]!.cumulativeBytes).toBe(0)
      expect(result[2]!.cumulativeBytes).toBe(1000) // 0 + 2500 - 1500
    })

    it('should preserve date and message information', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('abc123')
          .withDate('2024-01-01T10:00:00Z')
          .withMessage('First commit')
          .withFileChange(new FileChangeBuilder().withPath('file.js').build())
          .build(),
        new CommitDataBuilder()
          .withHash('def456')
          .withDate('2024-01-02T15:30:00Z')
          .withMessage('Second commit')
          .withFileChange(new FileChangeBuilder().withPath('file2.js').build())
          .build()
      ]

      const result = getLinearSeriesData(commits)
      
      expect(result).toHaveLength(3)
      
      // Check dates are preserved
      expect(result[0]!.date).toBe('2024-01-01T10:00:00Z') // Start point uses first commit date
      expect(result[1]!.date).toBe('2024-01-01T10:00:00Z')
      expect(result[2]!.date).toBe('2024-01-02T15:30:00Z')
      
      // Check SHAs are preserved
      expect(result[1]!.sha).toBe('abc123')
      expect(result[2]!.sha).toBe('def456')
    })

    it('should calculate net lines correctly', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('commit1')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('file.js')
              .withAdditions(100)
              .withDeletions(30)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('commit2')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('file2.js')
              .withAdditions(50)
              .withDeletions(80)
              .build()
          )
          .build()
      ]

      const result = getLinearSeriesData(commits)
      
      expect(result[0]!.netLines).toBe(0) // Start point
      expect(result[1]!.netLines).toBe(70) // 100 - 30
      expect(result[2]!.netLines).toBe(-30) // 50 - 80
    })

    it('should handle commits with multiple file changes', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('multi-file')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('file1.js')
              .withAdditions(50, 2500)
              .withDeletions(10, 500)
              .build()
          )
          .withFileChange(
            new FileChangeBuilder()
              .withPath('file2.js')
              .withAdditions(30, 1500)
              .withDeletions(5, 250)
              .build()
          )
          .build()
      ]

      const result = getLinearSeriesData(commits)
      
      expect(result).toHaveLength(2)
      
      // Should aggregate all file changes
      expect(result[1]!.linesAdded).toBe(80) // 50 + 30
      expect(result[1]!.linesDeleted).toBe(15) // 10 + 5
      expect(result[1]!.netLines).toBe(65) // 80 - 15
      expect(result[1]!.cumulativeLines).toBe(65)
      expect(result[1]!.cumulativeBytes).toBe(3250) // (2500 + 1500) - (500 + 250)
    })

    it('should handle commits with no file changes', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('empty-commit')
          .withMessage('Empty commit')
          .build() // No file changes
      ]

      const result = getLinearSeriesData(commits)
      
      expect(result).toHaveLength(2)
      
      // Should handle zero values correctly
      expect(result[1]!).toEqual({
        commitIndex: 1,
        sha: 'empty-commit',
        date: expect.any(String),
        cumulativeLines: 0,
        commits: 1,
        linesAdded: 0,
        linesDeleted: 0,
        netLines: 0,
        cumulativeBytes: 0
      })
    })

    it('should maintain starting point properties across different scenarios', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('test-commit')
          .withDate('2024-06-15T14:30:00Z')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('test.js')
              .withAdditions(42)
              .withDeletions(7)
              .build()
          )
          .build()
      ]

      const result = getLinearSeriesData(commits)
      
      // Starting point should always have these properties
      const startPoint = result[0]!
      expect(startPoint.commitIndex).toBe(0)
      expect(startPoint.sha).toBe('start')
      expect(startPoint.date).toBe('2024-06-15T14:30:00Z') // Same as first commit
      expect(startPoint.cumulativeLines).toBe(0)
      expect(startPoint.commits).toBe(0)
      expect(startPoint.linesAdded).toBe(0)
      expect(startPoint.linesDeleted).toBe(0)
      expect(startPoint.netLines).toBe(0)
      expect(startPoint.cumulativeBytes).toBe(0)
    })
  })
})