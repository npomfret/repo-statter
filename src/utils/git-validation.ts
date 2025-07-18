import { existsSync } from 'fs'
import { join } from 'path'
import { simpleGit } from 'simple-git'
import { GitParseError, formatError } from './errors.js'

export async function validateGitRepository(repoPath: string): Promise<void> {
  if (!existsSync(repoPath)) {
    throw new GitParseError(`Path does not exist: ${repoPath}`)
  }
  
  const gitDir = join(repoPath, '.git')
  if (!existsSync(gitDir)) {
    throw new GitParseError(`Not a git repository: ${repoPath}`)
  }
  
  try {
    const git = simpleGit(repoPath)
    await git.status()
  } catch (error) {
    throw new GitParseError(`Cannot access git repository at ${repoPath}: ${formatError(error)}`, error instanceof Error ? error : undefined)
  }
}