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
    testRepoPath = mkdtempSync(path.join(tmpdir(), 'repo-statter-file-movement-test-'))
    
    execSync('git init', { cwd: testRepoPath })
    execSync('git config user.name "Test User"', { cwd: testRepoPath })
    execSync('git config user.email "test@example.com"', { cwd: testRepoPath })
    
    const fileContent = Array.from({ length: 10 }, (_, i) => `// Line ${i + 1}`).join('\n')
    execSync(`echo "${fileContent}" > mycode.js`, { cwd: testRepoPath })
    execSync('git add mycode.js', { cwd: testRepoPath })
    execSync('git commit -m "Add mycode.js with 10 lines"', { cwd: testRepoPath })
    
    execSync('mkdir -p docs', { cwd: testRepoPath })
    execSync('git mv mycode.js docs/', { cwd: testRepoPath })
    execSync('git commit -m "Move mycode.js to docs/"', { cwd: testRepoPath })
    
    const additionalContent = Array.from({ length: 5 }, (_, i) => `// Additional line ${i + 1}`).join('\n')
    execSync(`echo "${additionalContent}" >> docs/mycode.js`, { cwd: testRepoPath })
    execSync('git add docs/mycode.js', { cwd: testRepoPath })
    execSync('git commit -m "Add 5 lines to docs/mycode.js"', { cwd: testRepoPath })
    
    execSync('git mv docs/mycode.js .', { cwd: testRepoPath })
    execSync('git commit -m "Move mycode.js back to root"', { cwd: testRepoPath })
    
    const moreContent = Array.from({ length: 3 }, (_, i) => `// More line ${i + 1}`).join('\n')
    execSync(`echo "${moreContent}" >> mycode.js`, { cwd: testRepoPath })
    execSync('git add mycode.js', { cwd: testRepoPath })
    execSync('git commit -m "Add 3 lines to mycode.js in root"', { cwd: testRepoPath })
    
    const docContent = Array.from({ length: 20 }, (_, i) => `# Doc line ${i + 1}`).join('\n')
    execSync(`echo "${docContent}" > docs/README.md`, { cwd: testRepoPath })
    execSync('git add docs/README.md', { cwd: testRepoPath })
    execSync('git commit -m "Add README.md directly to docs"', { cwd: testRepoPath })
  })
  
  afterAll(() => {
    rmSync(testRepoPath, { recursive: true, force: true })
  })
  
  it('should track LOC correctly when files move to/from excluded directories', { timeout: 10000 }, async () => {
    const commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: true }, TEST_CONFIG)
    
    const commitsAfterStep1 = commits.slice(0, 1)
    let totalLOC = commitsAfterStep1.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(totalLOC).toBe(10)
    
    const commitsAfterStep2 = commits.slice(0, 2)
    totalLOC = commitsAfterStep2.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(totalLOC).toBe(0)
    
    const commitsAfterStep3 = commits.slice(0, 3)
    totalLOC = commitsAfterStep3.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(totalLOC).toBe(0)
    
    const commitsAfterStep4 = commits.slice(0, 4)
    totalLOC = commitsAfterStep4.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(totalLOC).toBe(15)
    
    const commitsAfterStep5 = commits.slice(0, 5)
    totalLOC = commitsAfterStep5.reduce((sum, c) => sum + c.linesAdded - c.linesDeleted, 0)
    expect(totalLOC).toBe(18)
    
    expect(commits).toHaveLength(6)
    expect(commits[0]!.message).toBe('Add mycode.js with 10 lines')
    expect(commits[0]!.linesAdded).toBe(10)
    
    expect(commits[1]!.message).toBe('Move mycode.js to docs/')
    expect(commits[1]!.linesAdded).toBe(0)
    expect(commits[1]!.linesDeleted).toBe(10)
    
    expect(commits[2]!.message).toBe('Add 5 lines to docs/mycode.js')
    expect(commits[2]!.filesChanged).toHaveLength(0)
    
    expect(commits[3]!.message).toBe('Move mycode.js back to root')
    expect(commits[3]!.linesAdded).toBe(15)
    expect(commits[3]!.linesDeleted).toBe(0)
    
    expect(commits[4]!.message).toBe('Add 3 lines to mycode.js in root')
    expect(commits[4]!.linesAdded).toBe(3)
  })
  
  it('should handle files created directly in excluded directories', async () => {
    const commits = await parseCommitHistory(testRepoPath, undefined, undefined, { useCache: true }, TEST_CONFIG)
    const lastCommit = commits[commits.length - 1]
    
    expect(lastCommit).toBeDefined()
    expect(lastCommit!.message).toBe('Add README.md directly to docs')
    expect(lastCommit!.filesChanged).toHaveLength(0)
  })
})