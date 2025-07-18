import { describe, it, expect } from 'vitest'
import { getTimeSeriesData, getRepoAgeInHours } from './time-series-transformer.js'
import { CommitDataBuilder, FileChangeBuilder } from '../test/builders.js'

describe('Time Series Transformer', () => {
  describe('getRepoAgeInHours', () => {
    it('should return 0 for empty commits array', () => {
      const result = getRepoAgeInHours([])
      expect(result).toBe(0)
    })

    it('should return 0 for single commit', () => {
      const commit = new CommitDataBuilder()
        .withDate('2024-01-01T10:00:00Z')
        .build()
      
      const result = getRepoAgeInHours([commit])
      expect(result).toBe(0)
    })

    it('should calculate age in hours correctly', () => {
      const commits = [
        new CommitDataBuilder().withDate('2024-01-01T10:00:00Z').build(),
        new CommitDataBuilder().withDate('2024-01-01T13:00:00Z').build(),
        new CommitDataBuilder().withDate('2024-01-01T16:00:00Z').build()
      ]
      
      const result = getRepoAgeInHours(commits)
      expect(result).toBe(6) // 16:00 - 10:00 = 6 hours
    })

    it('should handle multi-day age calculation', () => {
      const commits = [
        new CommitDataBuilder().withDate('2024-01-01T10:00:00Z').build(),
        new CommitDataBuilder().withDate('2024-01-03T10:00:00Z').build()
      ]
      
      const result = getRepoAgeInHours(commits)
      expect(result).toBe(48) // 2 days = 48 hours
    })
  })

  describe('getTimeSeriesData', () => {
    it('should return empty array for no commits', () => {
      const result = getTimeSeriesData([])
      expect(result).toEqual([])
    })

    it('should use daily grouping for repos older than 48 hours', () => {
      const commits = [
        new CommitDataBuilder()
          .withDate('2024-01-01T10:00:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(10).withDeletions(5).build())
          .build(),
        new CommitDataBuilder()
          .withDate('2024-01-01T16:00:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(20).withDeletions(3).build())
          .build(),
        new CommitDataBuilder()
          .withDate('2024-01-04T12:00:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(15).withDeletions(8).build())
          .build()
      ]

      const result = getTimeSeriesData(commits)
      
      // Should have 3 points: start point (Dec 31), Jan 1, and Jan 4
      expect(result).toHaveLength(3)
      
      // First point should be starting point (one day before first commit)
      expect(result[0]!.date).toBe('2023-12-31')
      expect(result[0]!.commits).toBe(0)
      expect(result[0]!.cumulativeLines.total).toBe(0)
      
      // Second point should be Jan 1 with aggregated data
      expect(result[1]!.date).toBe('2024-01-01')
      expect(result[1]!.commits).toBe(2)
      expect(result[1]!.linesAdded.total).toBe(30)
      expect(result[1]!.linesDeleted.total).toBe(8)
      expect(result[1]!.cumulativeLines.total).toBe(22) // 30 - 8
      
      // Third point should be Jan 4
      expect(result[2]!.date).toBe('2024-01-04')
      expect(result[2]!.commits).toBe(1)
      expect(result[2]!.linesAdded.total).toBe(15)
      expect(result[2]!.linesDeleted.total).toBe(8)
      expect(result[2]!.cumulativeLines.total).toBe(29) // 22 + 15 - 8
    })

    it('should use hourly grouping for repos younger than 48 hours', () => {
      const commits = [
        new CommitDataBuilder()
          .withDate('2024-01-01T10:30:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(10).withDeletions(5).build())
          .build(),
        new CommitDataBuilder()
          .withDate('2024-01-01T10:45:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(20).withDeletions(3).build())
          .build(),
        new CommitDataBuilder()
          .withDate('2024-01-01T11:15:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(15).withDeletions(8).build())
          .build()
      ]

      const result = getTimeSeriesData(commits)
      
      // Should have 3 points: start point (9:00), 10:00, and 11:00
      expect(result).toHaveLength(3)
      
      // First point should be starting point (one hour before first commit)
      expect(result[0]!.date).toBe('2024-01-01T09:00:00')
      expect(result[0]!.commits).toBe(0)
      
      // Second point should be 10:00 hour with aggregated data
      expect(result[1]!.date).toBe('2024-01-01T10:00:00')
      expect(result[1]!.commits).toBe(2)
      expect(result[1]!.linesAdded.total).toBe(30)
      expect(result[1]!.linesDeleted.total).toBe(8)
      
      // Third point should be 11:00 hour
      expect(result[2]!.date).toBe('2024-01-01T11:00:00')
      expect(result[2]!.commits).toBe(1)
      expect(result[2]!.linesAdded.total).toBe(15)
      expect(result[2]!.linesDeleted.total).toBe(8)
    })

    it('should handle byte calculations correctly', () => {
      const commits = [
        new CommitDataBuilder()
          .withDate('2024-01-01T10:00:00Z')
          .withFileChange(
            new FileChangeBuilder()
              .withAdditions(10, 1000)
              .withDeletions(5, 500)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withDate('2024-01-03T10:00:00Z')
          .withFileChange(
            new FileChangeBuilder()
              .withAdditions(20, 2000)
              .withDeletions(3, 300)
              .build()
          )
          .build()
      ]

      const result = getTimeSeriesData(commits)
      
      // Should have 3 points: start point, Jan 1, and Jan 3
      expect(result).toHaveLength(3)
      
      // Jan 1 point
      expect(result[1]!.bytesAdded.total).toBe(1000)
      expect(result[1]!.bytesDeleted.total).toBe(500)
      expect(result[1]!.cumulativeBytes.total).toBe(500) // 1000 - 500
      
      // Jan 3 point
      expect(result[2]!.bytesAdded.total).toBe(2000)
      expect(result[2]!.bytesDeleted.total).toBe(300)
      expect(result[2]!.cumulativeBytes.total).toBe(2200) // 500 + 2000 - 300
    })

    it('should handle commits without byte data', () => {
      const commits = [
        new CommitDataBuilder()
          .withDate('2024-01-01T10:00:00Z')
          .withFileChange(
            new FileChangeBuilder()
              .withAdditionsNoByte(10) // No bytes specified
              .withDeletionsNoByte(5)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withDate('2024-01-03T10:00:00Z')
          .withFileChange(
            new FileChangeBuilder()
              .withAdditions(20, 2000)
              .withDeletions(3, 300)
              .build()
          )
          .build()
      ]

      // Manually set bytes to undefined for first commit
      delete (commits[0]! as any).bytesAdded
      delete (commits[0]! as any).bytesDeleted

      const result = getTimeSeriesData(commits)
      
      // Should handle missing byte data gracefully
      expect(result[1]!.bytesAdded.total).toBe(0)
      expect(result[1]!.bytesDeleted.total).toBe(0)
      expect(result[1]!.cumulativeBytes.total).toBe(0)
      
      expect(result[2]!.bytesAdded.total).toBe(2000)
      expect(result[2]!.bytesDeleted.total).toBe(300)
      expect(result[2]!.cumulativeBytes.total).toBe(1700) // 0 + 2000 - 300
    })

    it('should sort results by date', () => {
      const commits = [
        new CommitDataBuilder()
          .withDate('2024-01-03T10:00:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(10).build())
          .build(),
        new CommitDataBuilder()
          .withDate('2024-01-01T10:00:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(20).build())
          .build(),
        new CommitDataBuilder()
          .withDate('2024-01-02T10:00:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(15).build())
          .build()
      ]

      const result = getTimeSeriesData(commits)
      
      // Should be sorted by date in ascending order
      expect(result).toHaveLength(4)
      
      // Check dates are in ascending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i]!.date >= result[i-1]!.date).toBe(true)
      }
      
      // Check that all expected dates are present (in hourly format since this is a short repo)
      const dates = result.map(r => r.date)
      expect(dates).toContain('2024-01-01T10:00:00')
      expect(dates).toContain('2024-01-02T10:00:00')
      expect(dates).toContain('2024-01-03T10:00:00')
    })

    it('should maintain cumulative line counts correctly', () => {
      const commits = [
        new CommitDataBuilder()
          .withDate('2024-01-01T10:00:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(100).withDeletions(20).build())
          .build(),
        new CommitDataBuilder()
          .withDate('2024-01-02T10:00:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(50).withDeletions(30).build())
          .build(),
        new CommitDataBuilder()
          .withDate('2024-01-03T10:00:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(25).withDeletions(75).build())
          .build()
      ]

      const result = getTimeSeriesData(commits)
      
      expect(result[0]!.cumulativeLines.total).toBe(0) // Start point
      expect(result[1]!.cumulativeLines.total).toBe(80) // 100 - 20
      expect(result[2]!.cumulativeLines.total).toBe(100) // 80 + 50 - 30
      expect(result[3]!.cumulativeLines.total).toBe(50) // 100 + 25 - 75
    })

    it('should handle single commit correctly', () => {
      const commits = [
        new CommitDataBuilder()
          .withDate('2024-01-01T10:00:00Z')
          .withFileChange(new FileChangeBuilder().withAdditions(50).withDeletions(10).build())
          .build()
      ]

      const result = getTimeSeriesData(commits)
      
      // Should have 2 points: start point and the commit
      expect(result).toHaveLength(2)
      
      expect(result[0]!.date).toBe('2024-01-01T09:00:00') // Start point (hourly for single commit)
      expect(result[0]!.commits).toBe(0)
      expect(result[0]!.cumulativeLines.total).toBe(0)
      
      expect(result[1]!.date).toBe('2024-01-01T10:00:00')
      expect(result[1]!.commits).toBe(1)
      expect(result[1]!.linesAdded.total).toBe(50)
      expect(result[1]!.linesDeleted.total).toBe(10)
      expect(result[1]!.cumulativeLines.total).toBe(40)
    })
  })
})