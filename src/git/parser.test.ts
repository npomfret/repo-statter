import { describe, it, expect } from 'vitest'
import { parseCommitHistory } from './parser.js'
import path from 'path'
import { existsSync } from 'fs'
import type { ProgressReporter } from '../utils/progress-reporter.js'

describe('byte calculation integration test', () => {
  it('should calculate byte changes using line-based estimation', async () => {
    const testRepoPath = process.env['TEST_REPO_PATH'] || path.join(process.cwd(), 'test-repo')
    
    // Skip test if test repo doesn't exist
    if (!existsSync(testRepoPath)) {
      console.log('Skipping integration test: test repository not found at', testRepoPath)
      return
    }
    
    // Get all commit history with byte changes
    const commits = await parseCommitHistory(testRepoPath)
    
    // Verify that byte changes are calculated (using line-based estimation)
    let hasNonZeroBytes = false
    for (const commit of commits) {
      if ((commit.bytesAdded || 0) > 0 || (commit.bytesDeleted || 0) > 0) {
        hasNonZeroBytes = true
        break
      }
    }
    
    // Should have calculated some byte changes
    expect(hasNonZeroBytes).toBe(true)
    
    // Verify bytes are estimated as lines * 50
    const commitsWithChanges = commits.filter(c => c.linesAdded > 0)
    if (commitsWithChanges.length > 0) {
      const firstCommitWithChanges = commitsWithChanges[0]!
      const expectedBytes = firstCommitWithChanges.linesAdded * 50
      expect(firstCommitWithChanges.bytesAdded).toBe(expectedBytes)
    }
  }, 10000) // 10 second timeout for git operations
})

describe('parseCommitHistory with progress reporting', () => {
  it('should report progress when processing commits', async () => {
    const testRepoPath = process.env['TEST_REPO_PATH'] || path.join(process.cwd(), 'test-repo')
    
    // Skip test if test repo doesn't exist
    if (!existsSync(testRepoPath)) {
      console.log('Skipping integration test: test repository not found at', testRepoPath)
      return
    }
    
    // Create a mock progress reporter
    const progressUpdates: string[] = []
    const mockProgressReporter: ProgressReporter = {
      report(step: string, current?: number, total?: number) {
        if (current !== undefined && total !== undefined) {
          progressUpdates.push(`[${current}/${total}] ${step}`)
        } else {
          progressUpdates.push(step)
        }
      }
    }
    
    // Parse commits with progress reporter
    await parseCommitHistory(testRepoPath, mockProgressReporter)
    
    // Verify progress was reported
    expect(progressUpdates).toContain('Fetching commit history')
    expect(progressUpdates.some(update => update.startsWith('Processing') && update.includes('commits'))).toBe(true)
    expect(progressUpdates.some(update => update.includes('[') && update.includes('/') && update.includes('] Processing commits'))).toBe(true)
  }, 10000)
})