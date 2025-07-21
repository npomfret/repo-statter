import { describe, it, expect } from 'vitest'
import { TEST_CONFIG } from '../test/test-config.js'
import { 
  getContributorStats, 
  getContributorsByAverageLinesChanged,
  getLowestAverageLinesChanged,
  getHighestAverageLinesChanged
} from './contributor-calculator.js'
import { createTestCommit, createEmptyCommit } from '../test/builders.js'

describe('getContributorStats', () => {
  it('calculates stats for a single contributor', () => {
    const commits = [
      createTestCommit({ 
        authorName: 'Alice',
        linesAdded: 10,
        linesDeleted: 5
      }),
      createTestCommit({ 
        authorName: 'Alice',
        linesAdded: 20,
        linesDeleted: 3
      })
    ]
    
    const stats = getContributorStats(commits, TEST_CONFIG)
    
    expect(stats).toHaveLength(1)
    expect(stats[0]!).toEqual({
      name: 'Alice',
      commits: 2,
      linesAdded: 30,
      linesDeleted: 8
    })
  })
  
  it('calculates stats for multiple contributors', () => {
    const commits = [
      createTestCommit({ authorName: 'Alice', linesAdded: 10, linesDeleted: 5 }),
      createTestCommit({ authorName: 'Bob', linesAdded: 30, linesDeleted: 10 }),
      createTestCommit({ authorName: 'Alice', linesAdded: 20, linesDeleted: 3 }),
      createTestCommit({ authorName: 'Charlie', linesAdded: 5, linesDeleted: 2 })
    ]
    
    const stats = getContributorStats(commits, TEST_CONFIG)
    
    expect(stats).toHaveLength(3)
    expect(stats[0]!.name).toBe('Alice') // 2 commits, should be first
    expect(stats[0]!.commits).toBe(2)
    expect(stats[0]!.linesAdded).toBe(30)
    expect(stats[0]!.linesDeleted).toBe(8)
    
    expect(stats[1]!.name).toBe('Bob')
    expect(stats[2]!.name).toBe('Charlie')
  })
  
  it('sorts contributors by commit count descending', () => {
    const commits = [
      createTestCommit({ authorName: 'OneCommit' }),
      createTestCommit({ authorName: 'ThreeCommits' }),
      createTestCommit({ authorName: 'ThreeCommits' }),
      createTestCommit({ authorName: 'ThreeCommits' }),
      createTestCommit({ authorName: 'TwoCommits' }),
      createTestCommit({ authorName: 'TwoCommits' })
    ]
    
    const stats = getContributorStats(commits, TEST_CONFIG)
    
    expect(stats.map(s => s.name)).toEqual(['ThreeCommits', 'TwoCommits', 'OneCommit'])
    expect(stats.map(s => s.commits)).toEqual([3, 2, 1])
  })
  
  it('handles empty commits correctly', () => {
    const commits = [
      createEmptyCommit('Alice'),
      createTestCommit({ authorName: 'Alice', linesAdded: 10, linesDeleted: 5 })
    ]
    
    const stats = getContributorStats(commits, TEST_CONFIG)
    
    expect(stats[0]!).toEqual({
      name: 'Alice',
      commits: 2,
      linesAdded: 10,
      linesDeleted: 5
    })
  })
  
  it('throws on empty commits array', () => {
    expect(() => getContributorStats([], TEST_CONFIG)).toThrow('Cannot calculate contributor stats from empty commits array')
  })
})

describe('getContributorsByAverageLinesChanged', () => {
  it('calculates average lines changed per contributor', () => {
    const commits = [
      createTestCommit({ authorName: 'Alice', linesAdded: 10, linesDeleted: 5 }), // 15 total
      createTestCommit({ authorName: 'Alice', linesAdded: 5, linesDeleted: 10 }), // 15 total
      createTestCommit({ authorName: 'Alice', linesAdded: 20, linesDeleted: 0 }), // 20 total
      createTestCommit({ authorName: 'Alice', linesAdded: 0, linesDeleted: 10 }), // 10 total
      createTestCommit({ authorName: 'Alice', linesAdded: 5, linesDeleted: 5 }), // 10 total
      // Total: 70 lines changed, 5 commits = 14 average
    ]
    
    const stats = getContributorsByAverageLinesChanged(commits, TEST_CONFIG)
    
    expect(stats).toHaveLength(1)
    expect(stats[0]!).toEqual({
      name: 'Alice',
      commits: 5,
      averageLinesChanged: 14
    })
  })
  
  it('filters out contributors with less than 5 commits', () => {
    const commits = [
      // Bob has 6 commits
      ...Array(6).fill(null).map(() => 
        createTestCommit({ authorName: 'Bob', linesAdded: 10, linesDeleted: 0 })
      ),
      // Alice has 4 commits - should be filtered out
      ...Array(4).fill(null).map(() => 
        createTestCommit({ authorName: 'Alice', linesAdded: 10, linesDeleted: 0 })
      )
    ]
    
    const stats = getContributorsByAverageLinesChanged(commits, TEST_CONFIG)
    
    expect(stats).toHaveLength(1)
    expect(stats[0]!.name).toBe('Bob')
  })
  
  it('excludes merge commits from calculations', () => {
    const commits = [
      // 5 real commits
      ...Array(5).fill(null).map(() => 
        createTestCommit({ 
          authorName: 'Alice', 
          message: 'Add feature',
          linesAdded: 10, 
          linesDeleted: 0 
        })
      ),
      // Merge commits - should be excluded
      createTestCommit({ 
        authorName: 'Alice', 
        message: 'Merge branch feature',
        linesAdded: 100, 
        linesDeleted: 50 
      }),
      createTestCommit({ 
        authorName: 'Alice', 
        message: 'Merge pull request #123',
        linesAdded: 200, 
        linesDeleted: 100 
      })
    ]
    
    const stats = getContributorsByAverageLinesChanged(commits, TEST_CONFIG)
    
    expect(stats).toHaveLength(1)
    expect(stats[0]!.commits).toBe(5) // Only real commits counted
    expect(stats[0]!.averageLinesChanged).toBe(10) // 50 lines / 5 commits
  })
  
  it('handles multiple contributors with different averages', () => {
    const commits = [
      // Alice: 5 commits, 50 total lines = 10 average
      ...Array(5).fill(null).map(() => 
        createTestCommit({ authorName: 'Alice', linesAdded: 5, linesDeleted: 5 })
      ),
      // Bob: 10 commits, 200 total lines = 20 average
      ...Array(10).fill(null).map(() => 
        createTestCommit({ authorName: 'Bob', linesAdded: 15, linesDeleted: 5 })
      )
    ]
    
    const stats = getContributorsByAverageLinesChanged(commits, TEST_CONFIG)
    
    expect(stats).toHaveLength(2)
    const alice = stats.find(s => s.name === 'Alice')
    const bob = stats.find(s => s.name === 'Bob')
    
    expect(alice?.averageLinesChanged).toBe(10)
    expect(bob?.averageLinesChanged).toBe(20)
  })
})

describe('getLowestAverageLinesChanged', () => {
  it('returns contributors with lowest average lines changed', () => {
    const commits = [
      // Alice: 10 average
      ...Array(5).fill(null).map(() => 
        createTestCommit({ authorName: 'Alice', linesAdded: 5, linesDeleted: 5 })
      ),
      // Bob: 20 average
      ...Array(5).fill(null).map(() => 
        createTestCommit({ authorName: 'Bob', linesAdded: 10, linesDeleted: 10 })
      ),
      // Charlie: 5 average (lowest)
      ...Array(5).fill(null).map(() => 
        createTestCommit({ authorName: 'Charlie', linesAdded: 3, linesDeleted: 2 })
      )
    ]
    
    const stats = getLowestAverageLinesChanged(commits, TEST_CONFIG)
    
    expect(stats).toHaveLength(3)
    expect(stats[0]!.name).toBe('Charlie')
    expect(stats[0]!.averageLinesChanged).toBe(5)
    expect(stats[1]!.name).toBe('Alice')
    expect(stats[2]!.name).toBe('Bob')
  })
  
  it('returns at most 5 contributors', () => {
    const commits = []
    
    // Create 10 contributors with different averages
    for (let i = 1; i <= 10; i++) {
      const contributor = `Contributor${i}`
      for (let j = 0; j < 5; j++) {
        commits.push(createTestCommit({ 
          authorName: contributor, 
          linesAdded: i * 2, // Different average for each
          linesDeleted: 0 
        }))
      }
    }
    
    const stats = getLowestAverageLinesChanged(commits, TEST_CONFIG)
    
    expect(stats).toHaveLength(5)
    expect(stats[0]!.averageLinesChanged).toBe(2) // Contributor1
    expect(stats[4]!.averageLinesChanged).toBe(10) // Contributor5
  })
  
  it('returns empty array when no contributors qualify', () => {
    // Only 4 commits per contributor - none qualify
    const commits = [
      ...Array(4).fill(null).map(() => createTestCommit({ authorName: 'Alice' })),
      ...Array(4).fill(null).map(() => createTestCommit({ authorName: 'Bob' }))
    ]
    
    const stats = getLowestAverageLinesChanged(commits, TEST_CONFIG)
    
    expect(stats).toEqual([])
  })
})

describe('getHighestAverageLinesChanged', () => {
  it('returns contributors with highest average lines changed', () => {
    const commits = [
      // Alice: 10 average
      ...Array(5).fill(null).map(() => 
        createTestCommit({ authorName: 'Alice', linesAdded: 5, linesDeleted: 5 })
      ),
      // Bob: 20 average (highest)
      ...Array(5).fill(null).map(() => 
        createTestCommit({ authorName: 'Bob', linesAdded: 10, linesDeleted: 10 })
      ),
      // Charlie: 5 average
      ...Array(5).fill(null).map(() => 
        createTestCommit({ authorName: 'Charlie', linesAdded: 3, linesDeleted: 2 })
      )
    ]
    
    const stats = getHighestAverageLinesChanged(commits, TEST_CONFIG)
    
    expect(stats).toHaveLength(3)
    expect(stats[0]!.name).toBe('Bob')
    expect(stats[0]!.averageLinesChanged).toBe(20)
    expect(stats[1]!.name).toBe('Alice')
    expect(stats[2]!.name).toBe('Charlie')
  })
  
  it('handles edge case with one qualifying contributor', () => {
    const commits = [
      // Only Alice qualifies with 5 commits
      ...Array(5).fill(null).map(() => 
        createTestCommit({ authorName: 'Alice', linesAdded: 100, linesDeleted: 50 })
      ),
      // Bob doesn't qualify
      ...Array(3).fill(null).map(() => 
        createTestCommit({ authorName: 'Bob', linesAdded: 200, linesDeleted: 100 })
      )
    ]
    
    const stats = getHighestAverageLinesChanged(commits, TEST_CONFIG)
    
    expect(stats).toHaveLength(1)
    expect(stats[0]!.name).toBe('Alice')
    expect(stats[0]!.averageLinesChanged).toBe(150)
  })
})