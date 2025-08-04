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
      
      expect(result).toHaveLength(1)
      
      // First commit
      expect(result[0]!).toEqual({
        commitIndex: 0,
        sha: 'abc123',
        date: '2024-01-01T10:00:00Z',
        cumulativeLines: 40,
        commits: 1,
        linesAdded: 50,
        linesDeleted: 10,
        netLines: 40,
        cumulativeBytes: 2000
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
      
      expect(result).toHaveLength(3) // 3 commits
      
      // Verify cumulative calculations
      expect(result[0]!.cumulativeLines).toBe(80) // 100 - 20
      expect(result[0]!.cumulativeBytes).toBe(4000) // 5000 - 1000
      
      expect(result[1]!.cumulativeLines).toBe(100) // 80 + 50 - 30
      expect(result[1]!.cumulativeBytes).toBe(5000) // 4000 + 2500 - 1500
      
      expect(result[2]!.cumulativeLines).toBe(50) // 100 + 25 - 75
      expect(result[2]!.cumulativeBytes).toBe(2500) // 5000 + 1250 - 3750
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
      
      expect(result).toHaveLength(5) // 5 commits
      
      // Check index progression
      expect(result[0]!.commitIndex).toBe(0)
      expect(result[1]!.commitIndex).toBe(1)
      expect(result[2]!.commitIndex).toBe(2)
      expect(result[3]!.commitIndex).toBe(3)
      expect(result[4]!.commitIndex).toBe(4)
      
      // Check SHAs
      expect(result[0]!.sha).toBe('a')
      expect(result[1]!.sha).toBe('b')
      expect(result[2]!.sha).toBe('c')
      expect(result[3]!.sha).toBe('d')
      expect(result[4]!.sha).toBe('e')
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
      
      expect(result).toHaveLength(2)
      
      // First commit should handle undefined bytes as 0
      expect(result[0]!.cumulativeBytes).toBe(0)
      expect(result[1]!.cumulativeBytes).toBe(1000) // 0 + 2500 - 1500
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
      
      expect(result).toHaveLength(2)
      
      // Check dates are preserved
      expect(result[0]!.date).toBe('2024-01-01T10:00:00Z')
      expect(result[1]!.date).toBe('2024-01-02T15:30:00Z')
      
      // Check SHAs are preserved
      expect(result[0]!.sha).toBe('abc123')
      expect(result[1]!.sha).toBe('def456')
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
      
      expect(result[0]!.netLines).toBe(70) // 100 - 30
      expect(result[1]!.netLines).toBe(-30) // 50 - 80
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
      
      expect(result).toHaveLength(1)
      
      // Should aggregate all file changes
      expect(result[0]!.linesAdded).toBe(80) // 50 + 30
      expect(result[0]!.linesDeleted).toBe(15) // 10 + 5
      expect(result[0]!.netLines).toBe(65) // 80 - 15
      expect(result[0]!.cumulativeLines).toBe(65)
    })

    it('should handle commits with no file changes', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('empty-commit')
          .withMessage('Empty commit')
          .build() // No file changes
      ]

      const result = getLinearSeriesData(commits)
      
      expect(result).toHaveLength(1)
      
      // Should handle zero values correctly
      expect(result[0]!).toEqual({
        commitIndex: 0,
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
      
      // First commit should have these properties
      const firstPoint = result[0]!
      expect(firstPoint.commitIndex).toBe(0)
      expect(firstPoint.sha).toBe('test-commit')
      expect(firstPoint.date).toBe('2024-06-15T14:30:00Z')
      expect(firstPoint.cumulativeLines).toBe(35) // 42 - 7
      expect(firstPoint.commits).toBe(1)
      expect(firstPoint.linesAdded).toBe(42)
      expect(firstPoint.linesDeleted).toBe(7)
      expect(firstPoint.netLines).toBe(35)
      expect(firstPoint.cumulativeBytes).toBe(1750) // (42 - 7) * 50
    })

    describe('baseline consistency', () => {
      it('should produce identical final cumulative values regardless of starting commit', () => {
        // Create a realistic scenario with a large initial commit followed by smaller changes
        const commits = [
          // Commit 1: Large initial codebase
          new CommitDataBuilder()
            .withHash('initial')
            .withDate('2024-01-01T10:00:00Z')
            .withMessage('Initial large codebase')
            .withFileChange(
              new FileChangeBuilder()
                .withPath('src/main.js')
                .withAdditions(1000, 50000)  // Large initial commit
                .withDeletions(0, 0)
                .build()
            )
            .build(),
          
          // Commit 2: Small addition
          new CommitDataBuilder()
            .withHash('feature1')
            .withDate('2024-01-02T10:00:00Z')
            .withMessage('Add feature 1')
            .withFileChange(
              new FileChangeBuilder()
                .withPath('src/feature1.js')
                .withAdditions(50, 2500)
                .withDeletions(10, 500)
                .build()
            )
            .build(),
          
          // Commit 3: Refactoring - large deletion
          new CommitDataBuilder()
            .withHash('refactor')
            .withDate('2024-01-03T10:00:00Z')
            .withMessage('Major refactoring')
            .withFileChange(
              new FileChangeBuilder()
                .withPath('src/main.js')
                .withAdditions(200, 10000)
                .withDeletions(800, 40000)  // Major deletion
                .build()
            )
            .build(),
          
          // Commit 4: Small fix
          new CommitDataBuilder()
            .withHash('bugfix')
            .withDate('2024-01-04T10:00:00Z')
            .withMessage('Bug fix')
            .withFileChange(
              new FileChangeBuilder()
                .withPath('src/utils.js')
                .withAdditions(20, 1000)
                .withDeletions(5, 250)
                .build()
            )
            .build(),
          
          // Commit 5: Final addition
          new CommitDataBuilder()
            .withHash('final')
            .withDate('2024-01-05T10:00:00Z')
            .withMessage('Final feature')
            .withFileChange(
              new FileChangeBuilder()
                .withPath('src/final.js')
                .withAdditions(100, 5000)
                .withDeletions(0, 0)
                .build()
            )
            .build()
        ]

        // Test different analysis windows with appropriate baselines
        
        // Scenario 1: Full history (commits 1-5) - baseline = 0
        const fullHistory = getLinearSeriesData(commits, 0, 0)
        
        // Scenario 2: Skip first commit (commits 2-5) - baseline = state after commit 1
        const partialHistory = getLinearSeriesData(commits.slice(1), 50000, 1000)
        
        // Scenario 3: Start from commit 3 (commits 3-5) - baseline = state after commit 2
        const laterStart = getLinearSeriesData(commits.slice(2), 52000, 1040) // 50000 + 2500 - 500, 1000 + 50 - 10
        
        // Final cumulative values should be identical
        const finalFull = fullHistory[fullHistory.length - 1]!
        const finalPartial = partialHistory[partialHistory.length - 1]!
        const finalLater = laterStart[laterStart.length - 1]!
        
        expect(finalFull.cumulativeBytes).toBe(finalPartial.cumulativeBytes)
        expect(finalFull.cumulativeBytes).toBe(finalLater.cumulativeBytes)
        expect(finalFull.cumulativeLines).toBe(finalPartial.cumulativeLines)
        expect(finalFull.cumulativeLines).toBe(finalLater.cumulativeLines)
        
        // Verify the expected final values
        // Total: 50000 + 2000 - 30000 + 750 + 5000 = 27750 bytes
        // Total: 1000 + 40 - 600 + 15 + 100 = 555 lines
        expect(finalFull.cumulativeBytes).toBe(27750)
        expect(finalFull.cumulativeLines).toBe(555)
      })

      it('should prevent negative cumulative values when starting from proper baseline', () => {
        // Create scenario where large deletion would cause negative values without baseline
        const commits = [
          // Initial large commit (this would be the baseline)
          new CommitDataBuilder()
            .withHash('large-initial')
            .withMessage('Large initial commit')
            .withFileChange(
              new FileChangeBuilder()
                .withPath('generated.js')
                .withAdditions(5000, 250000)  // Large generated file
                .withDeletions(0, 0)
                .build()
            )
            .build(),
          
          // Massive refactoring that deletes most of the large file
          new CommitDataBuilder()
            .withHash('massive-refactor')
            .withMessage('Replace generated code with optimized version')
            .withFileChange(
              new FileChangeBuilder()
                .withPath('generated.js')
                .withAdditions(500, 25000)    // Small optimized replacement
                .withDeletions(4800, 240000)  // Delete most of original
                .build()
            )
            .build(),
          
          // Small addition after refactoring
          new CommitDataBuilder()
            .withHash('small-add')
            .withMessage('Add small feature')
            .withFileChange(
              new FileChangeBuilder()
                .withPath('feature.js')
                .withAdditions(100, 5000)
                .withDeletions(0, 0)
                .build()
            )
            .build()
        ]

        // Without baseline (old behavior) - this would cause negative values
        const withoutBaseline = getLinearSeriesData(commits.slice(1), 0, 0)
        
        // With proper baseline (new behavior)  
        const withBaseline = getLinearSeriesData(commits.slice(1), 250000, 5000) // State after first commit
        
        // Without baseline, the refactoring commit would have caused negative cumulative
        // But our Math.max(0, ...) prevents it
        expect(withoutBaseline[0]!.cumulativeBytes).toBe(0) // Math.max prevented negative
        expect(withoutBaseline[0]!.cumulativeLines).toBe(0)
        
        // With baseline, values should be positive and realistic
        expect(withBaseline[0]!.cumulativeBytes).toBe(35000) // 250000 + 25000 - 240000
        expect(withBaseline[0]!.cumulativeLines).toBe(700)   // 5000 + 500 - 4800
        
        // Final values should be different, proving baseline matters
        const finalWithout = withoutBaseline[withoutBaseline.length - 1]!
        const finalWith = withBaseline[withBaseline.length - 1]!
        
        expect(finalWith.cumulativeBytes).toBe(40000) // 35000 + 5000
        expect(finalWith.cumulativeLines).toBe(800)   // 700 + 100
        
        expect(finalWithout.cumulativeBytes).toBe(5000) // Only the small addition
        expect(finalWithout.cumulativeLines).toBe(100)
        
        // The baseline version should have much larger values, proving it's more accurate
        expect(finalWith.cumulativeBytes).toBeGreaterThan(finalWithout.cumulativeBytes)
        expect(finalWith.cumulativeLines).toBeGreaterThan(finalWithout.cumulativeLines)
      })

      it('should handle multiple large deletions correctly with baseline', () => {
        // Simulate a repository with multiple major refactoring events
        const commits = [
          // Commit 1: Initial codebase
          new CommitDataBuilder()
            .withHash('init')
            .withMessage('Initial version')
            .withFileChange(
              new FileChangeBuilder()
                .withPath('v1.js')
                .withAdditions(2000, 100000)
                .withDeletions(0, 0)
                .build()
            )
            .build(),
          
          // Commit 2: First refactoring
          new CommitDataBuilder()
            .withHash('refactor1')
            .withMessage('First major refactor')
            .withFileChange(
              new FileChangeBuilder()
                .withPath('v1.js')
                .withAdditions(800, 40000)
                .withDeletions(1500, 75000)
                .build()
            )
            .build(),
          
          // Commit 3: Second refactoring  
          new CommitDataBuilder()
            .withHash('refactor2')
            .withMessage('Second major refactor')
            .withFileChange(
              new FileChangeBuilder()
                .withPath('v1.js')
                .withAdditions(600, 30000)
                .withDeletions(900, 45000)
                .build()
            )
            .build()
        ]

        // Test analysis starting from different points
        const fullAnalysis = getLinearSeriesData(commits, 0, 0)
        const fromSecond = getLinearSeriesData(commits.slice(1), 100000, 2000)  // After commit 1
        const fromThird = getLinearSeriesData(commits.slice(2), 65000, 1300)    // After commit 2
        
        // All should reach the same final state
        const expected = {
          bytes: 50000,  // 100000 - 75000 + 40000 - 45000 + 30000
          lines: 1000    // 2000 - 1500 + 800 - 900 + 600
        }
        
        expect(fullAnalysis[fullAnalysis.length - 1]!.cumulativeBytes).toBe(expected.bytes)
        expect(fromSecond[fromSecond.length - 1]!.cumulativeBytes).toBe(expected.bytes)
        expect(fromThird[fromThird.length - 1]!.cumulativeBytes).toBe(expected.bytes)
        
        expect(fullAnalysis[fullAnalysis.length - 1]!.cumulativeLines).toBe(expected.lines)
        expect(fromSecond[fromSecond.length - 1]!.cumulativeLines).toBe(expected.lines)
        expect(fromThird[fromThird.length - 1]!.cumulativeLines).toBe(expected.lines)
      })
    })
  })
})