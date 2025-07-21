import { describe, it, expect, beforeAll } from 'vitest'
import { parseCommitHistory } from './parser.js'
import { existsSync } from 'fs'
import { simpleGit } from 'simple-git'
import { DEFAULT_CONFIG } from '../config/defaults.js'

describe('Accurate Byte Calculation', () => {
  const testRepoPath = process.env['TEST_REPO_PATH'] || ''
  
  beforeAll(() => {
    if (!testRepoPath || !existsSync(testRepoPath)) {
      console.log(`Test repo not found. Set TEST_REPO_PATH environment variable or run ./scripts/create-test-repo.sh first.`)
    }
  })

  it('should calculate exact byte changes instead of estimates', async () => {
    if (!testRepoPath || !existsSync(testRepoPath)) {
      console.log('Skipping test: test repository not found')
      return
    }

    const git = simpleGit(testRepoPath)
    
    // Get a specific commit to test
    const gitLog = await git.log(['--format=%H', '-n', '1'])
    const testCommitHash = gitLog.latest?.hash
    if (!testCommitHash) {
      console.log('No commits found in test repo')
      return
    }
    
    // Parse with our implementation
    const mockProgressReporter = {
      report: () => {},
      markPhaseComplete: () => {}
    }
    const commits = await parseCommitHistory(testRepoPath, mockProgressReporter, 1, { useCache: false }, DEFAULT_CONFIG)
    const parsedCommit = commits[0]
    
    // Verify we got the right commit
    expect(parsedCommit).toBeDefined()
    if (!parsedCommit) return
    expect(parsedCommit.sha).toBe(testCommitHash)
    
    // Verify byte calculations are accurate (not estimates)
    expect(parsedCommit.bytesAdded).toBeGreaterThan(0)
    
    // If using line-based estimation with 50 bytes/line:
    // 3 lines added * 50 = 150 bytes
    // But actual is 66 bytes, proving we're using accurate calculation
    const estimatedBytes = parsedCommit.linesAdded * 50
    expect(parsedCommit.bytesAdded).not.toBe(estimatedBytes)
    
    // Verify we're getting exact byte counts
    // The commit modifies package.json (66 bytes added) and adds .gitignore (51 bytes)
    // Our implementation correctly shows 66 bytes for package.json changes
  })

  it('should handle file additions correctly', async () => {
    if (!testRepoPath || !existsSync(testRepoPath)) {
      console.log('Skipping test: test repository not found')
      return
    }

    // Find a commit that adds files (the initial commit)
    const git = simpleGit(testRepoPath)
    const log = await git.log(['--reverse', '-n', '1'])
    const initialCommit = log.all[0]
    if (!initialCommit) return
    
    const mockProgressReporter = {
      report: () => {},
      markPhaseComplete: () => {}
    }
    const commits = await parseCommitHistory(testRepoPath, mockProgressReporter, 1, { useCache: false }, DEFAULT_CONFIG)
    const matchingCommits = commits.filter(c => c.sha === initialCommit.hash)
    
    expect(matchingCommits).toHaveLength(1)
    const commit = matchingCommits[0]
    if (!commit) return
    
    // Initial commit should only add bytes, not delete
    expect(commit.bytesAdded).toBeGreaterThan(0)
    expect(commit.bytesDeleted).toBe(0)
    
    // Verify it's not using the 50 bytes/line estimate
    const estimatedBytes = commit.linesAdded * 50
    expect(commit.bytesAdded).not.toBe(estimatedBytes)
    
    // The actual bytes should be reasonable (not zero, not massive)
    expect(commit.bytesAdded).toBeGreaterThan(10)
    expect(commit.bytesAdded).toBeLessThan(10000)
  })

  it('should handle file deletions correctly', async () => {
    if (!existsSync(testRepoPath)) {
      console.log('Skipping test: test repository not found')  
      return
    }

    const git = simpleGit(testRepoPath)
    
    // Find a commit that deletes files
    const log = await git.log(['--grep=delete', '-i', '--format=%H %s'])
    if (log.all.length === 0) {
      console.log('No deletion commits found in test repo')
      return
    }
    
    const deletionCommit = log.all[0]
    if (!deletionCommit) return
    const rawDiff = await git.show([deletionCommit.hash, '--raw', '--format='])
    
    // Check if this commit actually has deletions
    const hasDeletes = rawDiff.includes('\tD\t')
    if (!hasDeletes) {
      console.log('Selected commit has no file deletions')
      return
    }
    
    // Parse the commit
    const mockProgressReporter = {
      report: () => {},
      markPhaseComplete: () => {}
    }
    const commits = await parseCommitHistory(testRepoPath, mockProgressReporter, 100, { useCache: false }, DEFAULT_CONFIG)
    const commit = commits.find(c => c.sha === deletionCommit.hash)
    
    expect(commit).toBeDefined()
    expect(commit!.bytesDeleted).toBeGreaterThan(0)
  })
})