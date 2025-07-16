import { describe, it, expect } from 'vitest'
import {
  getTopCommitsByFilesModified,
  getTopCommitsByBytesAdded,
  getTopCommitsByBytesRemoved,
  getTopCommitsByLinesAdded,
  getTopCommitsByLinesRemoved
} from './award-calculator.js'
import { CommitDataBuilder, FileChangeBuilder } from '../test/builders.js'

describe('Award Calculator', () => {
  describe('getTopCommitsByFilesModified', () => {
    it('should return empty array for no commits', () => {
      const result = getTopCommitsByFilesModified([])
      expect(result).toEqual([])
    })

    it('should return top 5 commits by files modified', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('1').withMessage('Small change')
          .withFileChange(new FileChangeBuilder().withPath('a.js').build())
          .build(),
        new CommitDataBuilder()
          .withHash('2').withMessage('Big refactor')
          .withFileChange(new FileChangeBuilder().withPath('b.js').build())
          .withFileChange(new FileChangeBuilder().withPath('c.js').build())
          .withFileChange(new FileChangeBuilder().withPath('d.js').build())
          .build(),
        new CommitDataBuilder()
          .withHash('3').withMessage('Medium change')
          .withFileChange(new FileChangeBuilder().withPath('e.js').build())
          .withFileChange(new FileChangeBuilder().withPath('f.js').build())
          .build()
      ]

      const result = getTopCommitsByFilesModified(commits)
      
      expect(result).toHaveLength(3)
      expect(result[0].value).toBe(3)
      expect(result[0].sha).toBe('2')
      expect(result[1].value).toBe(2)
      expect(result[1].sha).toBe('3')
      expect(result[2].value).toBe(1)
      expect(result[2].sha).toBe('1')
    })

    it('should exclude merge commits', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('1').withMessage('Merge branch \'feature\'')
          .withFileChange(new FileChangeBuilder().withPath('a.js').build())
          .withFileChange(new FileChangeBuilder().withPath('b.js').build())
          .build(),
        new CommitDataBuilder()
          .withHash('2').withMessage('Real change')
          .withFileChange(new FileChangeBuilder().withPath('c.js').build())
          .build(),
        new CommitDataBuilder()
          .withHash('3').withMessage('Merge pull request #123')
          .withFileChange(new FileChangeBuilder().withPath('d.js').build())
          .build()
      ]

      const result = getTopCommitsByFilesModified(commits)
      
      expect(result).toHaveLength(1)
      expect(result[0].sha).toBe('2')
    })

    it('should limit to top 5 commits', () => {
      const commits = Array.from({ length: 10 }, (_, i) => 
        new CommitDataBuilder()
          .withHash(`${i}`)
          .withMessage(`Commit ${i}`)
          .withFileChanges(
            Array.from({ length: i + 1 }, (_, j) =>
              new FileChangeBuilder().withPath(`file${j}.js`).build()
            )
          )
          .build()
      )

      const result = getTopCommitsByFilesModified(commits)
      
      expect(result).toHaveLength(5)
      expect(result[0].value).toBe(10) // 10 files
      expect(result[4].value).toBe(6)  // 6 files
    })

    it('should handle ties by preserving order', () => {
      const commits = [
        new CommitDataBuilder().withHash('1').withMessage('First')
          .withFileChange(new FileChangeBuilder().withPath('a.js').build())
          .withFileChange(new FileChangeBuilder().withPath('b.js').build())
          .build(),
        new CommitDataBuilder().withHash('2').withMessage('Second')
          .withFileChange(new FileChangeBuilder().withPath('c.js').build())
          .withFileChange(new FileChangeBuilder().withPath('d.js').build())
          .build(),
        new CommitDataBuilder().withHash('3').withMessage('Third')
          .withFileChange(new FileChangeBuilder().withPath('e.js').build())
          .withFileChange(new FileChangeBuilder().withPath('f.js').build())
          .build()
      ]

      const result = getTopCommitsByFilesModified(commits)
      
      expect(result).toHaveLength(3)
      expect(result[0].sha).toBe('1') // First one with 2 files
      expect(result[1].sha).toBe('2') // Second one with 2 files
      expect(result[2].sha).toBe('3') // Third one with 2 files
    })
  })

  describe('getTopCommitsByBytesAdded', () => {
    it('should return empty array for no commits', () => {
      const result = getTopCommitsByBytesAdded([])
      expect(result).toEqual([])
    })

    it('should return top commits by bytes added', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('1').withMessage('Small addition')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('a.js')
              .withAdditions(10, 500)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('2').withMessage('Large addition')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('b.js')
              .withAdditions(100, 5000)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('3').withMessage('Medium addition')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('c.js')
              .withAdditions(50, 2500)
              .build()
          )
          .build()
      ]

      const result = getTopCommitsByBytesAdded(commits)
      
      expect(result).toHaveLength(3)
      expect(result[0].value).toBe(5000)
      expect(result[0].sha).toBe('2')
      expect(result[1].value).toBe(2500)
      expect(result[1].sha).toBe('3')
      expect(result[2].value).toBe(500)
      expect(result[2].sha).toBe('1')
    })

    it('should handle commits without bytesAdded', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('1').withMessage('Has bytes')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('a.js')
              .withAdditions(10, 1000)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('2').withMessage('No bytes')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('b.js')
              .withAdditions(20) // No bytes specified
              .build()
          )
          .build()
      ]

      // Manually set bytesAdded to undefined for the second commit
      commits[1].bytesAdded = undefined

      const result = getTopCommitsByBytesAdded(commits)
      
      expect(result).toHaveLength(1)
      expect(result[0].sha).toBe('1')
    })
  })

  describe('getTopCommitsByBytesRemoved', () => {
    it('should return top commits by bytes removed', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('1').withMessage('Small cleanup')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('a.js')
              .withDeletions(10, 500)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('2').withMessage('Major cleanup')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('b.js')
              .withDeletions(200, 10000)
              .build()
          )
          .build()
      ]

      const result = getTopCommitsByBytesRemoved(commits)
      
      expect(result).toHaveLength(2)
      expect(result[0].value).toBe(10000)
      expect(result[0].sha).toBe('2')
      expect(result[1].value).toBe(500)
      expect(result[1].sha).toBe('1')
    })
  })

  describe('getTopCommitsByLinesAdded', () => {
    it('should return top commits by lines added', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('1').withMessage('Feature A')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('a.js')
              .withAdditions(50)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('2').withMessage('Feature B')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('b.js')
              .withAdditions(150)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('3').withMessage('Feature C')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('c.js')
              .withAdditions(100)
              .build()
          )
          .build()
      ]

      const result = getTopCommitsByLinesAdded(commits)
      
      expect(result).toHaveLength(3)
      expect(result[0].value).toBe(150)
      expect(result[0].sha).toBe('2')
      expect(result[1].value).toBe(100)
      expect(result[1].sha).toBe('3')
      expect(result[2].value).toBe(50)
      expect(result[2].sha).toBe('1')
    })

    it('should aggregate lines from multiple files', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('1').withMessage('Multi-file change')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('a.js')
              .withAdditions(30)
              .build()
          )
          .withFileChange(
            new FileChangeBuilder()
              .withPath('b.js')
              .withAdditions(20)
              .build()
          )
          .build()
      ]

      const result = getTopCommitsByLinesAdded(commits)
      
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe(50)
    })
  })

  describe('getTopCommitsByLinesRemoved', () => {
    it('should return top commits by lines removed', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('1').withMessage('Cleanup')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('a.js')
              .withDeletions(75)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('2').withMessage('Refactor')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('b.js')
              .withDeletions(125)
              .build()
          )
          .build()
      ]

      const result = getTopCommitsByLinesRemoved(commits)
      
      expect(result).toHaveLength(2)
      expect(result[0].value).toBe(125)
      expect(result[0].sha).toBe('2')
      expect(result[1].value).toBe(75)
      expect(result[1].sha).toBe('1')
    })
  })

  describe('Award structure consistency', () => {
    it('should always return CommitAward with all required fields', () => {
      const commit = new CommitDataBuilder()
        .withHash('abc123')
        .withAuthor('John Doe', 'john@example.com')
        .withDate('2024-01-15T10:30:00Z')
        .withMessage('Test commit message')
        .withFileChange(
          new FileChangeBuilder()
            .withPath('test.js')
            .withAdditions(100, 5000)
            .withDeletions(50, 2500)
            .build()
        )
        .build()

      const filesResult = getTopCommitsByFilesModified([commit])[0]
      const bytesAddedResult = getTopCommitsByBytesAdded([commit])[0]
      const linesAddedResult = getTopCommitsByLinesAdded([commit])[0]

      // Check all have the same structure
      const checkAward = (award: any) => {
        expect(award).toHaveProperty('sha', 'abc123')
        expect(award).toHaveProperty('authorName', 'John Doe')
        expect(award).toHaveProperty('date', '2024-01-15T10:30:00Z')
        expect(award).toHaveProperty('message', 'Test commit message')
        expect(award).toHaveProperty('value')
        expect(typeof award.value).toBe('number')
      }

      checkAward(filesResult)
      checkAward(bytesAddedResult)
      checkAward(linesAddedResult)
    })
  })
})