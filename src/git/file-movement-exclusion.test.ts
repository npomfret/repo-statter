import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { parseCommitHistory } from './parser.js'
import { execSync } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { TEST_CONFIG } from '../test/test-config.js'

describe('File movement and exclusion patterns', () => {
  let testRepoPath: string
  
  beforeAll(() => {
    // Create a temporary directory for our test repo
    testRepoPath = mkdtempSync(path.join(tmpdir(), 'repo-statter-file-movement-test-'))
    
    // Initialize git repo
    execSync('git init', { cwd: testRepoPath })
    execSync('git config user.name "Test User"', { cwd: testRepoPath })
    execSync('git config user.email "test@example.com"', { cwd: testRepoPath })
  })
  
  afterAll(() => {
    // Clean up the test repo
    rmSync(testRepoPath, { recursive: true, force: true })
  })
  
  it('should track LOC correctly when files move to/from excluded directories', { timeout: 20000 }, async () => {
    // Step 1: Create a regular file with 10 lines
    const fileContent = Array.from({ length: 10 }, (_, i) => `// Line ${i + 1}`).join('\n')
    execSync(`echo "${fileContent}" > mycode.js`, { cwd: testRepoPath })
    execSync('git add mycode.js', { cwd: testRepoPath })
    execSync('git commit -m "Add mycode.js with 10 lines"', { cwd: testRepoPath })
    
    // Get LOC after first commit
    let commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: false }, TEST_CONFIG)
    let totalLOC = commits.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(totalLOC).toBe(10)
    
    // Step 2: Move file to docs directory (which is excluded)
    execSync('mkdir -p docs', { cwd: testRepoPath })
    execSync('git mv mycode.js docs/', { cwd: testRepoPath })
    execSync('git commit -m "Move mycode.js to docs/"', { cwd: testRepoPath })
    
    // Get LOC after move - should drop to 0 (file is now in excluded directory)
    commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: false }, TEST_CONFIG)
    totalLOC = commits.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(totalLOC).toBe(0)
    
    // Step 3: Edit the file in docs (add 5 lines)
    const additionalContent = Array.from({ length: 5 }, (_, i) => `// Additional line ${i + 1}`).join('\n')
    execSync(`echo "${additionalContent}" >> docs/mycode.js`, { cwd: testRepoPath })
    execSync('git add docs/mycode.js', { cwd: testRepoPath })
    execSync('git commit -m "Add 5 lines to docs/mycode.js"', { cwd: testRepoPath })
    
    // Get LOC after edit in excluded directory
    // The 5 new lines should be excluded because they were added while the file was in docs/
    commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: false }, TEST_CONFIG)
    totalLOC = commits.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(totalLOC).toBe(0) // Still 0, because edits in docs/ are excluded
    
    // Step 4: Move file back to root directory
    execSync('git mv docs/mycode.js .', { cwd: testRepoPath })
    execSync('git commit -m "Move mycode.js back to root"', { cwd: testRepoPath })
    
    // Get LOC after moving back - file now has 15 lines and is counted again
    commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: false }, TEST_CONFIG)
    totalLOC = commits.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(totalLOC).toBe(15) // File is back in non-excluded directory with 15 lines
    
    // Step 5: Add more lines after moving back (should be included)
    const moreContent = Array.from({ length: 3 }, (_, i) => `// More line ${i + 1}`).join('\n')
    execSync(`echo "${moreContent}" >> mycode.js`, { cwd: testRepoPath })
    execSync('git add mycode.js', { cwd: testRepoPath })
    execSync('git commit -m "Add 3 lines to mycode.js in root"', { cwd: testRepoPath })
    
    // Final LOC count should be 18 (15 after move back + 3 new)
    commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: false }, TEST_CONFIG)
    totalLOC = commits.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(totalLOC).toBe(18)
    
    // Verify individual commits
    expect(commits).toHaveLength(5)
    expect(commits[0]!.message).toBe('Add mycode.js with 10 lines')
    expect(commits[0]!.linesAdded).toBe(10)
    
    expect(commits[1]!.message).toBe('Move mycode.js to docs/')
    expect(commits[1]!.linesAdded).toBe(0)
    expect(commits[1]!.linesDeleted).toBe(10) // Subtracts 10 lines when moving to excluded dir
    
    expect(commits[2]!.message).toBe('Add 5 lines to docs/mycode.js')
    expect(commits[2]!.filesChanged).toHaveLength(0) // Files in docs/ are excluded
    // This commit should be excluded from LOC count
    
    expect(commits[3]!.message).toBe('Move mycode.js back to root')
    expect(commits[3]!.linesAdded).toBe(15) // Adds 15 lines when moving back from excluded dir
    expect(commits[3]!.linesDeleted).toBe(0)
    
    expect(commits[4]!.message).toBe('Add 3 lines to mycode.js in root')
    expect(commits[4]!.linesAdded).toBe(3)
  })
  
  it('should handle files created directly in excluded directories', async () => {
    // Create a new file directly in docs/
    execSync('mkdir -p docs', { cwd: testRepoPath })
    const docContent = Array.from({ length: 20 }, (_, i) => `# Doc line ${i + 1}`).join('\n')
    execSync(`echo "${docContent}" > docs/README.md`, { cwd: testRepoPath })
    execSync('git add docs/README.md', { cwd: testRepoPath })
    execSync('git commit -m "Add README.md directly to docs"', { cwd: testRepoPath })
    
    // This file should be completely excluded from LOC count
    const commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: false }, TEST_CONFIG)
    const lastCommit = commits[commits.length - 1]
    
    expect(lastCommit).toBeDefined()
    expect(lastCommit!.message).toBe('Add README.md directly to docs')
    expect(lastCommit!.filesChanged).toHaveLength(0) // Files in docs/ are excluded
    // The commit exists but its lines should not be counted in total LOC
  })
})