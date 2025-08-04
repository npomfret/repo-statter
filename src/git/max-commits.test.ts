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

  it('should demonstrate limitations of partial commit history analysis', { timeout: 10000 }, async () => {
    // This test demonstrates that analyzing partial commit history has inherent limitations:
    // 1. Files created before the analysis window are not seen
    // 2. File states are calculated from the partial window, not true final state
    // 3. Only recently modified files are analyzed with their cumulative changes from the window
    
    const [allCommits, last4Commits, last2Commits] = await Promise.all([
      parseCommitHistory(testRepoPath, undefined, undefined, { useCache: true }, DEFAULT_CONFIG),
      parseCommitHistory(testRepoPath, undefined, 4, { useCache: true }, DEFAULT_CONFIG),
      parseCommitHistory(testRepoPath, undefined, 2, { useCache: true }, DEFAULT_CONFIG)
    ])

    // Helper function to calculate file state from a commit window
    const calculateFileStateFromWindow = (commits: any[]) => {
      const fileSizeMap = new Map<string, number>()
      
      for (const commit of commits) {
        for (const fileChange of commit.filesChanged) {
          const currentSize = fileSizeMap.get(fileChange.fileName) ?? 0
          const sizeChange = fileChange.linesAdded - fileChange.linesDeleted
          fileSizeMap.set(fileChange.fileName, Math.max(0, currentSize + sizeChange))
        }
      }
      
      return fileSizeMap
    }

    const allFileState = calculateFileStateFromWindow(allCommits)
    const last4FileState = calculateFileStateFromWindow(last4Commits)
    const last2FileState = calculateFileStateFromWindow(last2Commits)

    // ASSERTION 1: Different windows see different sets of files
    const allFiles = Array.from(allFileState.keys()).filter(file => (allFileState.get(file) || 0) > 0)
    const last4Files = Array.from(last4FileState.keys()).filter(file => (last4FileState.get(file) || 0) > 0)
    const last2Files = Array.from(last2FileState.keys()).filter(file => (last2FileState.get(file) || 0) > 0)

    // Smaller windows see fewer files (files not modified in the window are invisible)
    expect(last4Files.length).toBeLessThanOrEqual(allFiles.length)
    expect(last2Files.length).toBeLessThanOrEqual(last4Files.length)

    // ASSERTION 2: Verify actual behavior based on our test data
    // From our commit setup:
    // - file1.js: 10 lines (commit 1 - initial, never changed) 
    // - file2.js: 20 lines (commit 2), then reduced by 5 in commit 5 (net: +15)
    // - file3.js: 30 lines (commit 3), then increased by 5 in commit 4 (net: +35)
    // - file5.js: 50 lines (commit 6)
    
    // All commits: should see true final state
    expect(allFileState.get('file1.js')).toBe(10)
    expect(allFileState.get('file2.js')).toBe(15) // 20 - 5 = 15
    expect(allFileState.get('file3.js')).toBe(35) // 30 + 5 = 35
    expect(allFileState.get('file5.js')).toBe(50)

    // Last 4 commits (commits 3,4,5,6): misses file1, but sees others from their creation/modification
    expect(last4FileState.has('file1.js')).toBe(false) // Not modified in this window
    expect(last4FileState.get('file2.js')).toBe(0) // Sees only the -5 change from commit 5, not the +20 from commit 2
    expect(last4FileState.get('file3.js')).toBe(35) // Sees creation (+30) and modification (+5)  
    expect(last4FileState.get('file5.js')).toBe(50) // Sees creation

    // Last 2 commits (commits 5,6): sees only recent changes
    expect(last2FileState.has('file1.js')).toBe(false) // Not modified in this window
    expect(last2FileState.get('file2.js')).toBe(0) // Sees only the -5 change, not the +20 base
    expect(last2FileState.has('file3.js')).toBe(false) // Not modified in this window (last change was commit 4)
    expect(last2FileState.get('file5.js')).toBe(50) // Sees creation

    // ASSERTION 3: This demonstrates why maxCommits is a performance trade-off, not accuracy
    // - Full history gives accurate file states but is slow
    // - Partial history gives incomplete picture but is fast
    // - The tool should use currentFiles from git to supplement missing information

    // Files with 0 size in partial windows had earlier state that wasn't captured
    const allFilesInWindow = Array.from(last4FileState.keys()) // All files seen, regardless of final size
    const zeroSizeFiles = allFilesInWindow.filter(file => (last4FileState.get(file) || 0) === 0)
    expect(zeroSizeFiles).toContain('file2.js') // This file shows the limitation

    // ASSERTION 4: Cumulative metrics are also affected by window size
    const allCumulative = allCommits.reduce((sum, commit) => sum + commit.linesAdded - commit.linesDeleted, 0)
    const last4Cumulative = last4Commits.reduce((sum, commit) => sum + commit.linesAdded - commit.linesDeleted, 0)
    const last2Cumulative = last2Commits.reduce((sum, commit) => sum + commit.linesAdded - commit.linesDeleted, 0)

    expect(allCumulative).toBe(110) // True total: 10 + 15 + 35 + 50
    expect(last4Cumulative).toBe(80) // Last 4 commits: +30 + 5 - 5 + 50 = 80 
    expect(last2Cumulative).toBe(45) // Only recent changes: -5 + 50 = 45
  })
})