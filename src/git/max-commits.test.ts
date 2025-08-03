import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { parseCommitHistory } from './parser.js'
import { DEFAULT_CONFIG } from '../config/defaults.js'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { execSync } from 'child_process'

describe('Max Commits Feature', () => {
  let testRepoPath: string
  let totalCommits: number
  
  beforeAll(() => {
    // Create a test repository with known commits
    testRepoPath = mkdtempSync(join(tmpdir(), 'repo-statter-test-'))
    
    // Initialize git repo
    execSync('git init', { cwd: testRepoPath })
    execSync('git config user.name "Test User"', { cwd: testRepoPath })
    execSync('git config user.email "test@example.com"', { cwd: testRepoPath })
    
    // Create commits with predictable line changes (reduced from 10 to 6 for faster tests)
    const commits = [
      { file: 'file1.js', lines: 10, message: 'Initial commit' },
      { file: 'file2.js', lines: 20, message: 'Add file2' },
      { file: 'file3.js', lines: 30, message: 'Add file3' },
      { file: 'file3.js', lines: 35, message: 'Update file3 (+5 lines)' },
      { file: 'file2.js', lines: 15, message: 'Reduce file2 to 15 lines' },
      { file: 'file5.js', lines: 50, message: 'Add file5' },
    ]
    
    totalCommits = commits.length
    
    commits.forEach((commit) => {
      const content = Array(commit.lines).fill('').map((_, i) => `// Line ${i + 1}`).join('\n')
      writeFileSync(join(testRepoPath, commit.file), content)
      execSync(`git add ${commit.file}`, { cwd: testRepoPath })
      execSync(`git commit -m "${commit.message}"`, { cwd: testRepoPath })
    })
  })
  
  afterAll(() => {
    // Clean up test repository
    if (testRepoPath) {
      rmSync(testRepoPath, { recursive: true, force: true })
    }
  })
  
  it('should return the most recent N commits when using --max-commits', async () => {
    const maxCommits = 5
    const commits = await parseCommitHistory(
      testRepoPath, 
      undefined, 
      maxCommits, 
      { useCache: true }, 
      DEFAULT_CONFIG
    )
    
    expect(commits).toHaveLength(maxCommits)
    
    // Verify these are the most recent commits
    const lastCommit = commits[commits.length - 1]
    const secondLastCommit = commits[commits.length - 2]
    const thirdLastCommit = commits[commits.length - 3]
    const fourthLastCommit = commits[commits.length - 4]
    const fifthLastCommit = commits[commits.length - 5]
    
    expect(lastCommit?.message).toBe('Add file5')
    expect(secondLastCommit?.message).toBe('Reduce file2 to 15 lines')
    expect(thirdLastCommit?.message).toBe('Update file3 (+5 lines)')
    expect(fourthLastCommit?.message).toBe('Add file3')
    expect(fifthLastCommit?.message).toBe('Add file2')
  })
  
  it('should maintain chronological order when using --max-commits', async () => {
    const maxCommits = 3
    const commits = await parseCommitHistory(
      testRepoPath, 
      undefined, 
      maxCommits, 
      { useCache: true }, 
      DEFAULT_CONFIG
    )
    
    // Verify chronological order (oldest to newest)
    expect(commits[0]?.message).toBe('Update file3 (+5 lines)')
    expect(commits[1]?.message).toBe('Reduce file2 to 15 lines')
    expect(commits[2]?.message).toBe('Add file5')
  })
  
  it('should calculate consistent final cumulative lines regardless of starting point', { timeout: 10000 }, async () => {
    // Get different subsets of commits in parallel for better performance
    const [allCommits, last5Commits, last3Commits] = await Promise.all([
      parseCommitHistory(
        testRepoPath, 
        undefined, 
        undefined, 
        { useCache: true }, 
        DEFAULT_CONFIG
      ),
      parseCommitHistory(
        testRepoPath, 
        undefined, 
        5, 
        { useCache: true }, 
        DEFAULT_CONFIG
      ),
      parseCommitHistory(
        testRepoPath, 
        undefined, 
        3, 
        { useCache: true }, 
        DEFAULT_CONFIG
      )
    ])
    
    const calculateCumulativeLines = (commits: any[]) => {
      return commits.reduce((sum, commit) => sum + commit.linesAdded - commit.linesDeleted, 0)
    }
    
    const allCumulative = calculateCumulativeLines(allCommits)
    const last5Cumulative = calculateCumulativeLines(last5Commits)
    const last3Cumulative = calculateCumulativeLines(last3Commits)
    
    expect(last5Cumulative).toBeLessThan(allCumulative)
    expect(last3Cumulative).toBeLessThan(last5Cumulative)
    
    expect(allCumulative).toBe(110)
  })
  
  it('should handle edge cases gracefully', async () => {
    const commits = await parseCommitHistory(
      testRepoPath, 
      undefined, 
      100, 
      { useCache: true }, 
      DEFAULT_CONFIG
    )
    
    expect(commits).toHaveLength(totalCommits)
  })
  
  it('should work with caching for partial commit history', async () => {
    const maxCommits = 5
    const cacheOptions = { useCache: true }
    
    // First run - no cache
    const firstRun = await parseCommitHistory(
      testRepoPath, 
      undefined, 
      maxCommits, 
      cacheOptions, 
      DEFAULT_CONFIG
    )
    
    // Second run - should use cache
    const secondRun = await parseCommitHistory(
      testRepoPath, 
      undefined, 
      maxCommits, 
      cacheOptions, 
      DEFAULT_CONFIG
    )
    
    expect(firstRun).toEqual(secondRun)
    expect(firstRun).toHaveLength(maxCommits)
  })
  
  it('should invalidate cache when requesting more commits than cached', async () => {
    const cacheOptions = { useCache: true }
    
    // First run with 3 commits
    const firstRun = await parseCommitHistory(
      testRepoPath, 
      undefined, 
      3, 
      cacheOptions, 
      DEFAULT_CONFIG
    )
    
    // Second run requesting 5 commits - should invalidate cache
    const secondRun = await parseCommitHistory(
      testRepoPath, 
      undefined, 
      5, 
      cacheOptions, 
      DEFAULT_CONFIG
    )
    
    expect(firstRun).toHaveLength(3)
    expect(secondRun).toHaveLength(5)
    
    // Verify we got different sets of commits
    expect(secondRun[0]?.message).not.toBe(firstRun[0]?.message)
  })
})