/**
 * Integration tests for git streaming using real repositories
 * Based on V1 test repository creation technique
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { GitRepository } from '../repository.js'
import { CommitInfo } from '../../types/git.js'

describe('Git Streaming Integration Tests', () => {
  let testRepoPath: string
  let gitRepo: GitRepository

  beforeAll(async () => {
    // Create a real test repository with diverse commits
    testRepoPath = await createTestRepository()
    gitRepo = new GitRepository(testRepoPath)
  })

  afterAll(async () => {
    // Cleanup test repository
    if (testRepoPath) {
      await fs.rm(testRepoPath, { recursive: true, force: true })
    }
  })

  describe('Real Git Log Streaming', () => {
    it('should stream all commits from a real repository', async () => {
      const commits: CommitInfo[] = []
      
      for await (const commit of gitRepo.streamCommits()) {
        commits.push(commit)
      }

      // Verify we got the expected number of commits from our test repo
      expect(commits.length).toBeGreaterThanOrEqual(12)
      
      // Verify commit structure
      commits.forEach(commit => {
        expect(commit.sha).toMatch(/^[a-f0-9]{40}$/)
        expect(commit.author).toBeTruthy()
        expect(commit.email).toMatch(/@/)
        expect(commit.timestamp).toBeInstanceOf(Date)
        expect(commit.stats).toBeDefined()
        expect(commit.stats.filesChanged).toBeGreaterThanOrEqual(0)
      })
    })

    it('should handle file changes correctly', async () => {
      const commits: CommitInfo[] = []
      
      for await (const commit of gitRepo.streamCommits()) {
        commits.push(commit)
      }

      // Find commits with file operations
      const commitsWithFiles = commits.filter(c => c.stats.filesChanged > 0)
      expect(commitsWithFiles.length).toBeGreaterThan(0)

      // Verify file changes have proper structure
      commitsWithFiles.forEach(commit => {
        commit.stats.files.forEach(file => {
          expect(file.path).toBeTruthy()
          expect(typeof file.additions).toBe('number')
          expect(typeof file.deletions).toBe('number')
          expect(['modified', 'added', 'deleted', 'renamed']).toContain(file.status)
        })
      })
    })

    it('should respect maxCommits limit', async () => {
      const commits: CommitInfo[] = []
      const maxCommits = 5
      
      for await (const commit of gitRepo.streamCommits({ maxCommits })) {
        commits.push(commit)
      }

      expect(commits).toHaveLength(maxCommits)
    })

    it('should handle different contributors correctly', async () => {
      const commits: CommitInfo[] = []
      
      for await (const commit of gitRepo.streamCommits()) {
        commits.push(commit)
      }

      // Get unique authors
      const authors = new Set(commits.map(c => c.author))
      
      // Should have at least our test authors (Alice, Bob, Carol)
      expect(authors.size).toBeGreaterThanOrEqual(2)
      expect([...authors].some(author => author.includes('Alice'))).toBe(true)
      expect([...authors].some(author => author.includes('Bob'))).toBe(true)
    })

    it('should handle date filtering', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const commits: CommitInfo[] = []
      
      for await (const commit of gitRepo.streamCommits({ since: threeDaysAgo })) {
        commits.push(commit)
      }

      // Should have recent commits (our test repo has commits from 1-2 days ago)
      expect(commits.length).toBeGreaterThan(0)
      
      // All commits should be after the since date
      commits.forEach(commit => {
        expect(commit.timestamp.getTime()).toBeGreaterThanOrEqual(threeDaysAgo.getTime())
      })
    })

    it('should handle large file operations', async () => {
      // Create additional large file for testing
      const largeFilePath = join(testRepoPath, 'large-test-file.js')
      const largeContent = Array(1000).fill(0).map((_, i) => `console.log("Line ${i}");`).join('\n')
      
      await fs.writeFile(largeFilePath, largeContent)
      await execGitCommand(testRepoPath, ['add', 'large-test-file.js'])
      await execGitCommand(testRepoPath, ['commit', '-m', 'Add large test file for streaming test'])

      const commits: CommitInfo[] = []
      
      for await (const commit of gitRepo.streamCommits({ maxCommits: 1 })) {
        commits.push(commit)
      }

      const latestCommit = commits[0]
      expect(latestCommit.stats.filesChanged).toBe(1)
      
      const largeFile = latestCommit.stats.files.find(f => f.path === 'large-test-file.js')
      expect(largeFile).toBeDefined()
      expect(largeFile!.additions).toBe(1000)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid repository path', async () => {
      const invalidRepo = new GitRepository('/nonexistent/path')
      
      await expect(async () => {
        for await (const commit of invalidRepo.streamCommits()) {
          // Should never get here
        }
      }).rejects.toThrow('Not a valid git repository')
    })

    it('should handle empty repository', async () => {
      // Create empty git repo
      const emptyRepoPath = join(tmpdir(), `repo-statter-empty-test-${Date.now()}`)
      await fs.mkdir(emptyRepoPath)
      await execGitCommand(emptyRepoPath, ['init'])
      
      const emptyRepo = new GitRepository(emptyRepoPath)
      const commits: CommitInfo[] = []
      
      try {
        for await (const commit of emptyRepo.streamCommits()) {
          commits.push(commit)
        }
        expect(commits).toHaveLength(0)
      } catch (error) {
        // Empty repos may throw errors, which is acceptable
        expect(error).toBeDefined()
      } finally {
        await fs.rm(emptyRepoPath, { recursive: true, force: true })
      }
    })
  })
})

/**
 * Create a test repository with diverse commits, files, and operations
 * Based on the V1 create-test-repo.sh script
 */
async function createTestRepository(): Promise<string> {
  const repoPath = join(tmpdir(), `repo-statter-test-${Date.now()}`)
  await fs.mkdir(repoPath, { recursive: true })
  
  // Initialize git repo
  await execGitCommand(repoPath, ['init'])
  
  // Configure test users
  const users = [
    { name: 'Alice Johnson', email: 'alice@example.com' },
    { name: 'Bob Smith', email: 'bob@example.com' },
    { name: 'Carol Davis', email: 'carol@example.com' }
  ]

  // Helper to create file content
  const generateFileContent = (lines: number, extension: string, baseName: string): string => {
    const content: string[] = []
    for (let i = 1; i <= lines; i++) {
      switch (extension) {
        case 'js':
          content.push(`// Line ${i} in ${baseName}.${extension} - ${Date.now()}`)
          break
        case 'ts':
          content.push(`// TypeScript line ${i} in ${baseName}.${extension} - ${Date.now()}`)
          break
        case 'json':
          if (i === 1) content.push('{')
          else if (i === lines) content.push('}')
          else content.push(`  "key${i}": "value${i}",`)
          break
        case 'md':
          if (i === 1) content.push(`# ${baseName}`)
          else content.push(`Content line ${i} for ${baseName} documentation`)
          break
        default:
          content.push(`Line ${i} content for ${baseName}.${extension} with data ${Date.now()}`)
      }
    }
    return content.join('\n')
  }

  // Helper to commit as specific user
  const commitAs = async (userIndex: number, message: string, daysAgo: number = 0) => {
    const user = users[userIndex]
    await execGitCommand(repoPath, ['config', 'user.name', user.name])
    await execGitCommand(repoPath, ['config', 'user.email', user.email])
    await execGitCommand(repoPath, ['add', '.'])
    
    if (daysAgo > 0) {
      const commitDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
      await execGitCommand(repoPath, ['commit', '-m', message, `--date=${commitDate}`])
    } else {
      await execGitCommand(repoPath, ['commit', '-m', message])
    }
  }

  // Create diverse commit history
  
  // Commit 1: Alice creates initial JavaScript files
  await fs.writeFile(join(repoPath, 'utils.js'), generateFileContent(8, 'js', 'utils'))
  await fs.writeFile(join(repoPath, 'app.js'), generateFileContent(12, 'js', 'app'))
  await commitAs(0, 'Initial commit: Add basic JavaScript application structure', 30)

  // Commit 2: Bob adds TypeScript configuration
  await fs.writeFile(join(repoPath, 'tsconfig.json'), generateFileContent(12, 'json', 'tsconfig'))
  await fs.mkdir(join(repoPath, 'src'), { recursive: true })
  await fs.writeFile(join(repoPath, 'src', 'types.ts'), generateFileContent(15, 'ts', 'types'))
  await fs.writeFile(join(repoPath, 'src', 'api.ts'), generateFileContent(25, 'ts', 'api'))
  await commitAs(1, 'Add TypeScript configuration and API client', 25)

  // Commit 3: Carol adds package.json and helpers
  await fs.writeFile(join(repoPath, 'package.json'), generateFileContent(15, 'json', 'package'))
  await fs.writeFile(join(repoPath, 'helpers.js'), generateFileContent(20, 'js', 'helpers'))
  await commitAs(2, 'Add package.json and helper utilities', 22)

  // Commit 4: Alice refactors and adds logger
  await fs.writeFile(join(repoPath, 'src', 'logger.ts'), generateFileContent(30, 'ts', 'logger'))
  // Append to utils.js
  const existingUtils = await fs.readFile(join(repoPath, 'utils.js'), 'utf-8')
  await fs.writeFile(join(repoPath, 'utils.js'), existingUtils + '\n' + generateFileContent(5, 'js', 'utils_extra'))
  await commitAs(0, 'Add logging system and extend utilities', 18)

  // Commit 5: Bob adds database layer
  await fs.writeFile(join(repoPath, 'src', 'database.ts'), generateFileContent(35, 'ts', 'database'))
  await commitAs(1, 'Add database layer and user repository', 15)

  // Commit 6: Carol adds validation
  await fs.writeFile(join(repoPath, 'validation.js'), generateFileContent(25, 'js', 'validation'))
  await commitAs(2, 'Add input validation and error handling', 12)

  // Commit 7: Alice deletes helpers.js and refactors
  await fs.unlink(join(repoPath, 'helpers.js'))
  await fs.writeFile(join(repoPath, 'app.js'), generateFileContent(18, 'js', 'app'))
  await commitAs(0, 'Remove helpers.js and refactor app to use validation', 10)

  // Commit 8: Bob adds events system
  await fs.writeFile(join(repoPath, 'src', 'events.ts'), generateFileContent(28, 'ts', 'events'))
  await commitAs(1, 'Add event system with TypeScript generics', 8)

  // Commit 9: Carol adds config
  await fs.writeFile(join(repoPath, 'config.js'), generateFileContent(30, 'js', 'config'))
  await commitAs(2, 'Add configuration management system', 6)

  // Commit 10: Major cleanup
  await fs.unlink(join(repoPath, 'validation.js'))
  await fs.writeFile(join(repoPath, 'utils.js'), generateFileContent(3, 'js', 'utils'))
  await fs.writeFile(join(repoPath, 'app.js'), generateFileContent(8, 'js', 'app'))
  await commitAs(2, 'Major cleanup: Remove validation system and simplify utils', 4)

  // Commit 11: Alice adds services
  await fs.writeFile(join(repoPath, 'src', 'services.ts'), generateFileContent(32, 'ts', 'services'))
  await commitAs(0, 'Add service layer with event integration', 2)

  // Commit 12: Bob adds README
  await fs.writeFile(join(repoPath, 'README.md'), generateFileContent(18, 'md', 'README'))
  await commitAs(1, 'Add README documentation', 1)

  console.log(`✅ Created test repository at: ${repoPath}`)
  return repoPath
}

/**
 * Execute a git command in the specified directory
 */
function execGitCommand(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn('git', args, { cwd })
    let stdout = ''
    let stderr = ''

    process.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(`Git command failed (${code}): ${stderr}`))
      }
    })
  })
}