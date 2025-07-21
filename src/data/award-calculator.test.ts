import { describe, it, expect } from 'vitest'
import { TEST_CONFIG } from '../test/test-config.js'
import {
  getTopCommitsByFilesModified,
  getTopCommitsByBytesAdded,
  getTopCommitsByBytesRemoved,
  getTopCommitsByLinesAdded,
  getTopCommitsByLinesRemoved,
  type CommitAward
} from './award-calculator.js'
import { CommitDataBuilder, FileChangeBuilder } from '../test/builders.js'
import type { CommitData } from '../git/parser.js'
import type { AnalysisContext } from '../report/generator.js'

type AwardFunction = (context: AnalysisContext) => CommitAward[]

function createTestContext(commits: CommitData[]): AnalysisContext {
  return {
    repoPath: '/fake/repo',
    repoName: 'test-repo',
    isLizardInstalled: false,
    currentFiles: new Set<string>(),
    commits,
    config: TEST_CONFIG
  }
}

interface TestCase {
  name: string
  fn: AwardFunction
  setupCommit: (builder: CommitDataBuilder, value: number) => CommitDataBuilder
  skipUndefinedTest?: boolean
}

const testCases: TestCase[] = [
  {
    name: 'getTopCommitsByFilesModified',
    fn: getTopCommitsByFilesModified,
    setupCommit: (builder, value) => {
      for (let i = 0; i < value; i++) {
        builder.withFileChange(new FileChangeBuilder().withPath(`file${i}.js`).build())
      }
      return builder
    }
  },
  {
    name: 'getTopCommitsByBytesAdded',
    fn: getTopCommitsByBytesAdded,
    setupCommit: (builder, value) => builder.withFileChange(
      new FileChangeBuilder().withPath('file.js').withAdditions(value / 50, value).build()
    ),
    skipUndefinedTest: false
  },
  {
    name: 'getTopCommitsByBytesRemoved',
    fn: getTopCommitsByBytesRemoved,
    setupCommit: (builder, value) => builder.withFileChange(
      new FileChangeBuilder().withPath('file.js').withDeletions(value / 50, value).build()
    ),
    skipUndefinedTest: false
  },
  {
    name: 'getTopCommitsByLinesAdded',
    fn: getTopCommitsByLinesAdded,
    setupCommit: (builder, value) => builder.withFileChange(
      new FileChangeBuilder().withPath('file.js').withAdditions(value, value * 50).build()
    )
  },
  {
    name: 'getTopCommitsByLinesRemoved',
    fn: getTopCommitsByLinesRemoved,
    setupCommit: (builder, value) => builder.withFileChange(
      new FileChangeBuilder().withPath('file.js').withDeletions(value, value * 50).build()
    )
  }
]

describe('Award Calculator', () => {
  describe.each(testCases)('$name', ({ fn, setupCommit, skipUndefinedTest }) => {
    it('should return empty array for no commits', () => {
      const result = fn(createTestContext([]))
      expect(result).toEqual([])
    })

    it('should return top commits sorted by value', () => {
      const commits = [
        setupCommit(new CommitDataBuilder().withHash('1').withMessage('Small change'), 10).build(),
        setupCommit(new CommitDataBuilder().withHash('2').withMessage('Large change'), 100).build(),
        setupCommit(new CommitDataBuilder().withHash('3').withMessage('Medium change'), 50).build()
      ]

      const result = fn(createTestContext(commits))
      
      expect(result).toHaveLength(3)
      expect(result[0]!.sha).toBe('2')
      expect(result[0]!.value).toBe(100)
      expect(result[1]!.sha).toBe('3')
      expect(result[1]!.value).toBe(50)
      expect(result[2]!.sha).toBe('1')
      expect(result[2]!.value).toBe(10)
    })

    it('should exclude merge commits', () => {
      const commits = [
        setupCommit(
          new CommitDataBuilder().withHash('1').withMessage('Merge branch \'feature\''),
          20
        ).build(),
        setupCommit(
          new CommitDataBuilder().withHash('2').withMessage('Real change'),
          10
        ).build(),
        setupCommit(
          new CommitDataBuilder().withHash('3').withMessage('Merge pull request #123'),
          30
        ).build()
      ]

      const result = fn(createTestContext(commits))
      
      expect(result).toHaveLength(1)
      expect(result[0]!.sha).toBe('2')
    })

    it('should exclude automated commits', () => {
      const commits = [
        setupCommit(
          new CommitDataBuilder().withHash('1').withMessage('Bump version to 1.2.3'),
          10
        ).build(),
        setupCommit(
          new CommitDataBuilder().withHash('2').withMessage('Update dependencies for security'),
          20
        ).build(),
        setupCommit(
          new CommitDataBuilder().withHash('3').withMessage('chore: update dependency axios to v1.5.0'),
          30
        ).build(),
        setupCommit(
          new CommitDataBuilder().withHash('4').withMessage('Implement new feature'),
          15
        ).build()
      ]

      const result = fn(createTestContext(commits))
      
      expect(result).toHaveLength(1)
      expect(result[0]!.sha).toBe('4')
    })

    it('should exclude conflict resolution commits', () => {
      const commits = [
        setupCommit(
          new CommitDataBuilder().withHash('1').withMessage('Resolved conflicts by accepting remote component'),
          20
        ).build(),
        setupCommit(
          new CommitDataBuilder().withHash('2').withMessage('Resolving conflicts in feature branch'),
          30
        ).build(),
        setupCommit(
          new CommitDataBuilder().withHash('3').withMessage('Fixed conflict by accepting incoming changes'),
          25
        ).build(),
        setupCommit(
          new CommitDataBuilder().withHash('4').withMessage('Real feature implementation'),
          10
        ).build()
      ]

      const result = fn(createTestContext(commits))
      
      expect(result).toHaveLength(1)
      expect(result[0]!.sha).toBe('4')
    })

    it('should exclude bot commits', () => {
      const commits = [
        setupCommit(
          new CommitDataBuilder().withHash('1').withMessage('chore(deps): update dependency eslint to v8 - renovate[bot]'),
          30
        ).build(),
        setupCommit(
          new CommitDataBuilder().withHash('2').withMessage('Bump axios from 0.21.1 to 0.21.2 - dependabot[bot]'),
          20
        ).build(),
        setupCommit(
          new CommitDataBuilder().withHash('3').withMessage('WhiteSource security update'),
          25
        ).build(),
        setupCommit(
          new CommitDataBuilder().withHash('4').withMessage('Add security scanning to CI pipeline'),
          15
        ).build()
      ]

      const result = fn(createTestContext(commits))
      
      expect(result).toHaveLength(1)
      expect(result[0]!.sha).toBe('4')
    })

    it('should limit results to top 5', () => {
      const commits = Array.from({ length: 10 }, (_, i) => 
        setupCommit(
          new CommitDataBuilder()
            .withHash(String(i))
            .withMessage(`Change ${i}`),
          (10 - i) * 10
        ).build()
      )

      const result = fn(createTestContext(commits))
      
      expect(result).toHaveLength(5)
      expect(result[0]!.sha).toBe('0')
      expect(result[4]!.sha).toBe('4')
    })

    if (!skipUndefinedTest) {
      it('should handle commits with undefined values', () => {
        const commits = [
          new CommitDataBuilder().withHash('1').withMessage('No stats').build(),
          setupCommit(
            new CommitDataBuilder().withHash('2').withMessage('With stats'),
            50
          ).build()
        ]

        const result = fn(createTestContext(commits))
        
        expect(result.length).toBeGreaterThan(0)
        expect(result.some(r => r.sha === '2')).toBe(true)
      })
    }
  })

  // Additional specific tests
  describe('getTopCommitsByBytesAdded', () => {
    it('should handle commits with only bytes deleted', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('1').withMessage('Delete old files')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('old.js')
              .withDeletions(100, 5000)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('2').withMessage('Add new feature')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('new.js')
              .withAdditions(50, 2500)
              .build()
          )
          .build()
      ]

      const result = getTopCommitsByBytesAdded(createTestContext(commits))
      
      // Should only include commits with bytes added > 0
      const commitsWithBytesAdded = result.filter(r => r.value > 0)
      expect(commitsWithBytesAdded).toHaveLength(1)
      expect(commitsWithBytesAdded[0]!.sha).toBe('2')
    })
  })

  describe('Award value calculations', () => {
    it('should calculate award values correctly', () => {
      const builder = new CommitDataBuilder()
        .withHash('test')
        .withMessage('Test commit')
      
      // Test files modified
      const filesCommit = builder
        .withFileChange(new FileChangeBuilder().withPath('a.js').build())
        .withFileChange(new FileChangeBuilder().withPath('b.js').build())
        .withFileChange(new FileChangeBuilder().withPath('c.js').build())
        .build()
      
      const filesResult = getTopCommitsByFilesModified(createTestContext([filesCommit]))
      expect(filesResult[0]!.value).toBe(3)
      
      // Test bytes added
      const bytesCommit = new CommitDataBuilder()
        .withHash('bytes')
        .withMessage('Bytes test')
        .withFileChange(
          new FileChangeBuilder()
            .withPath('file.js')
            .withAdditions(100, 5000)
            .build()
        )
        .build()
      
      const bytesAddedResult = getTopCommitsByBytesAdded(createTestContext([bytesCommit]))
      expect(bytesAddedResult[0]!.value).toBe(5000)
      
      // Test lines added
      const linesCommit = new CommitDataBuilder()
        .withHash('lines')
        .withMessage('Lines test')
        .withFileChange(
          new FileChangeBuilder()
            .withPath('file.js')
            .withAdditions(150, 7500)
            .build()
        )
        .build()
      
      const linesAddedResult = getTopCommitsByLinesAdded(createTestContext([linesCommit]))
      expect(linesAddedResult[0]!.value).toBe(150)
    })
  })

  describe('Cross-function consistency', () => {
    it('should apply consistent filtering across all functions', () => {
      const commits = [
        new CommitDataBuilder()
          .withHash('merge')
          .withMessage('Merge branch feature')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('merged.js')
              .withAdditions(100, 5000)
              .withDeletions(50, 2500)
              .build()
          )
          .build(),
        new CommitDataBuilder()
          .withHash('real')
          .withMessage('Real feature work')
          .withFileChange(
            new FileChangeBuilder()
              .withPath('feature.js')
              .withAdditions(50, 2500)
              .withDeletions(25, 1250)
              .build()
          )
          .build()
      ]

      const filesResult = getTopCommitsByFilesModified(createTestContext(commits))
      const bytesAddedResult = getTopCommitsByBytesAdded(createTestContext(commits))
      const bytesRemovedResult = getTopCommitsByBytesRemoved(createTestContext(commits))
      const linesAddedResult = getTopCommitsByLinesAdded(createTestContext(commits))
      const linesRemovedResult = getTopCommitsByLinesRemoved(createTestContext(commits))

      // All should exclude the merge commit
      expect(filesResult).toHaveLength(1)
      expect(bytesAddedResult).toHaveLength(1)
      expect(bytesRemovedResult).toHaveLength(1)
      expect(linesAddedResult).toHaveLength(1)
      expect(linesRemovedResult).toHaveLength(1)

      // All should return the real commit
      expect(filesResult[0]!.sha).toBe('real')
      expect(bytesAddedResult[0]!.sha).toBe('real')
      expect(bytesRemovedResult[0]!.sha).toBe('real')
      expect(linesAddedResult[0]!.sha).toBe('real')
      expect(linesRemovedResult[0]!.sha).toBe('real')
    })
  })

  describe('Award structure', () => {
    it('should return correct award structure', () => {
      const commit = new CommitDataBuilder()
        .withHash('abc123')
        .withAuthor('John Doe')
        .withDate(new Date('2023-01-01').toISOString())
        .withMessage('Important feature')
        .withFileChange(new FileChangeBuilder().withPath('feature.js').build())
        .build()

      const result = getTopCommitsByFilesModified(createTestContext([commit]))
      
      expect(result[0]).toEqual({
        sha: 'abc123',
        authorName: 'John Doe',
        date: new Date('2023-01-01').toISOString(),
        message: 'Important feature',
        value: 1
      })

      function checkAward(award: CommitAward | undefined): void {
        expect(award).toBeDefined()
        expect(award!.sha).toBeDefined()
        expect(award!.authorName).toBeDefined()
        expect(award!.date).toBeDefined()
        expect(award!.message).toBeDefined()
        expect(award!.value).toBeGreaterThanOrEqual(0)
      }

      const filesResult = getTopCommitsByFilesModified(createTestContext([commit]))[0]
      const bytesAddedResult = getTopCommitsByBytesAdded(createTestContext([commit]))[0]
      const linesAddedResult = getTopCommitsByLinesAdded(createTestContext([commit]))[0]

      checkAward(filesResult)
      checkAward(bytesAddedResult)
      checkAward(linesAddedResult)
    })
  })
})