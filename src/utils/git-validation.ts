import { existsSync } from 'fs'
import { join } from 'path'
import { simpleGit } from 'simple-git'

export async function validateGitRepository(repoPath: string): Promise<void> {
  if (!existsSync(repoPath)) {
    throw new Error(`Path does not exist: ${repoPath}`)
  }
  
  const gitDir = join(repoPath, '.git')
  if (!existsSync(gitDir)) {
    throw new Error(`Not a git repository: ${repoPath}`)
  }
  
  try {
    const git = simpleGit(repoPath)
    await git.status()
  } catch (error: any) {
    throw new Error(`Cannot access git repository at ${repoPath}: ${error.message}`)
  }
}