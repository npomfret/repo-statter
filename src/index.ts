import { simpleGit } from 'simple-git'

export interface CommitData {
  sha: string
  authorName: string
  authorEmail: string
  date: string
  message: string
}

export async function parseCommitHistory(repoPath: string): Promise<CommitData[]> {
  const git = simpleGit(repoPath)
  
  const log = await git.log({
    format: {
      hash: '%H',
      author_name: '%an',
      author_email: '%ae',
      date: '%ai',
      message: '%s'
    },
    strictDate: true,
    '--reverse': null
  })
  
  return log.all.map(commit => ({
    sha: commit.hash,
    authorName: commit.author_name,
    authorEmail: commit.author_email,
    date: commit.date,
    message: commit.message
  }))
}

export const VERSION = '1.0.0' as const