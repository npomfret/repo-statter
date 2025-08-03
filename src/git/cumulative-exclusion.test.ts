import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { parseCommitHistory } from './parser.js'
import { execSync } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { TEST_CONFIG } from '../test/test-config.js'
import type { CommitData } from './parser.js'

describe('Cumulative LOC with file moves to excluded directories', () => {
  let testRepoPath: string
  let allCommits: CommitData[]
  
  beforeAll(() => {
    testRepoPath = mkdtempSync(path.join(tmpdir(), 'repo-statter-cumulative-test-'))
    
    execSync('git init', { cwd: testRepoPath })
    execSync('git config user.name "Test User"', { cwd: testRepoPath })
    execSync('git config user.email "test@example.com"', { cwd: testRepoPath })
    
    const file1 = Array.from({ length: 40 }, (_, i) => `// File1 Line ${i + 1}`).join('\n')
    const file2 = Array.from({ length: 60 }, (_, i) => `// File2 Line ${i + 1}`).join('\n')
    
    execSync(`echo "${file1}" > src1.js`, { cwd: testRepoPath })
    execSync(`echo "${file2}" > src2.js`, { cwd: testRepoPath })
    execSync('git add .', { cwd: testRepoPath })
    execSync('git commit -m "Add initial source files (100 lines)"', { cwd: testRepoPath })
    
    execSync('mkdir -p docs', { cwd: testRepoPath })
    execSync('git mv src1.js docs/', { cwd: testRepoPath })
    execSync('git mv src2.js docs/', { cwd: testRepoPath })
    execSync('git commit -m "Move files to docs directory"', { cwd: testRepoPath })
    
    const file3 = Array.from({ length: 20 }, (_, i) => `// File3 Line ${i + 1}`).join('\n')
    execSync(`echo "${file3}" > src3.js`, { cwd: testRepoPath })
    execSync('git add src3.js', { cwd: testRepoPath })
    execSync('git commit -m "Add new source file (20 lines)"', { cwd: testRepoPath })
    
    execSync('git mv docs/src1.js .', { cwd: testRepoPath })
    execSync('git commit -m "Move src1.js back to root"', { cwd: testRepoPath })
  })
  
  afterAll(() => {
    rmSync(testRepoPath, { recursive: true, force: true })
  })
  
  it('should show cumulative LOC drop when files are moved to excluded directories', { timeout: 10000 }, async () => {
    allCommits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: true }, TEST_CONFIG)
    
    const commitsAfterStep1 = allCommits.slice(0, 1)
    let cumulativeLOC = commitsAfterStep1.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(cumulativeLOC).toBe(100)
    
    const commitsAfterStep2 = allCommits.slice(0, 2)
    cumulativeLOC = commitsAfterStep2.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    
    expect(cumulativeLOC).toBe(0)
    
    const commitsAfterStep3 = allCommits.slice(0, 3)
    cumulativeLOC = commitsAfterStep3.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(cumulativeLOC).toBe(20)
    
    const commitsAfterStep4 = allCommits
    cumulativeLOC = commitsAfterStep4.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(cumulativeLOC).toBe(60)
  })
})