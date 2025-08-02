import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { parseCommitHistory } from './parser.js'
import { execSync } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { TEST_CONFIG } from '../test/test-config.js'

describe('Cumulative LOC with file moves to excluded directories', () => {
  let testRepoPath: string
  
  beforeAll(() => {
    // Create a temporary directory for our test repo
    testRepoPath = mkdtempSync(path.join(tmpdir(), 'repo-statter-cumulative-test-'))
    
    // Initialize git repo
    execSync('git init', { cwd: testRepoPath })
    execSync('git config user.name "Test User"', { cwd: testRepoPath })
    execSync('git config user.email "test@example.com"', { cwd: testRepoPath })
  })
  
  afterAll(() => {
    // Clean up the test repo
    rmSync(testRepoPath, { recursive: true, force: true })
  })
  
  it('should show cumulative LOC drop when files are moved to excluded directories', { timeout: 20000 }, async () => {
    // Step 1: Create initial source files (100 lines total)
    const file1 = Array.from({ length: 40 }, (_, i) => `// File1 Line ${i + 1}`).join('\n')
    const file2 = Array.from({ length: 60 }, (_, i) => `// File2 Line ${i + 1}`).join('\n')
    
    execSync(`echo "${file1}" > src1.js`, { cwd: testRepoPath })
    execSync(`echo "${file2}" > src2.js`, { cwd: testRepoPath })
    execSync('git add .', { cwd: testRepoPath })
    execSync('git commit -m "Add initial source files (100 lines)"', { cwd: testRepoPath })
    
    let commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: false }, TEST_CONFIG)
    let cumulativeLOC = commits.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(cumulativeLOC).toBe(100) // Should have 100 lines
    
    // Step 2: Move files to docs directory (should cause LOC to drop to 0)
    execSync('mkdir -p docs', { cwd: testRepoPath })
    execSync('git mv src1.js docs/', { cwd: testRepoPath })
    execSync('git mv src2.js docs/', { cwd: testRepoPath })
    execSync('git commit -m "Move files to docs directory"', { cwd: testRepoPath })
    
    commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: false }, TEST_CONFIG)
    cumulativeLOC = commits.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    
    console.log('After move to docs:')
    commits.forEach((c, i) => {
      console.log(`  Commit ${i}: ${c.message} - Lines: +${c.linesAdded}/-${c.linesDeleted} (net: ${c.linesAdded - c.linesDeleted})`)
      c.filesChanged.forEach(f => console.log(`    - ${f.fileName}: +${f.linesAdded}/-${f.linesDeleted}`))
    })
    console.log(`  Cumulative LOC: ${cumulativeLOC}`)
    
    // THIS IS THE CRITICAL TEST: LOC should drop to 0 because files are now in excluded directory
    // Current implementation fails this - it stays at 100
    expect(cumulativeLOC).toBe(0) // ❌ This will fail with current implementation
    
    // Step 3: Add more content to regular directory
    const file3 = Array.from({ length: 20 }, (_, i) => `// File3 Line ${i + 1}`).join('\n')
    execSync(`echo "${file3}" > src3.js`, { cwd: testRepoPath })
    execSync('git add src3.js', { cwd: testRepoPath })
    execSync('git commit -m "Add new source file (20 lines)"', { cwd: testRepoPath })
    
    commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: false }, TEST_CONFIG)
    cumulativeLOC = commits.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(cumulativeLOC).toBe(20) // Should only count the new file, not the moved ones
    
    // Step 4: Move one file back from docs to root (should add its lines back)
    execSync('git mv docs/src1.js .', { cwd: testRepoPath })
    execSync('git commit -m "Move src1.js back to root"', { cwd: testRepoPath })
    
    commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: false }, TEST_CONFIG)
    cumulativeLOC = commits.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(cumulativeLOC).toBe(60) // 20 (src3.js) + 40 (src1.js back from docs)
  })
})