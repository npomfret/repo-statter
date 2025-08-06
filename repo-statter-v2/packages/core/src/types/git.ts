/**
 * Core git-related type definitions for repo-statter
 */

export interface CommitInfo {
  /** SHA hash of the commit */
  sha: string
  /** Author name */
  author: string
  /** Author email address */
  email: string
  /** Commit timestamp */
  timestamp: Date
  /** Commit message */
  message: string
  /** Statistics for this commit */
  stats: CommitStats
  /** Parent commit SHAs */
  parents?: string[]
}

export interface CommitStats {
  /** Number of files changed in this commit */
  filesChanged: number
  /** Total lines added */
  additions: number
  /** Total lines deleted */
  deletions: number
  /** Detailed file changes */
  files: FileChange[]
  /** Total bytes added */
  bytesAdded?: number
  /** Total bytes deleted */
  bytesDeleted?: number
}

export interface FileChange {
  /** File path relative to repository root */
  path: string
  /** Lines added in this file */
  additions: number
  /** Lines deleted in this file */
  deletions: number
  /** Type of change */
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied'
  /** Previous path for renamed/moved files */
  oldPath?: string
  /** File mode (permissions) */
  mode?: string
  /** Binary file flag */
  isBinary?: boolean
  /** Bytes added */
  bytesAdded?: number
  /** Bytes deleted */
  bytesDeleted?: number
}

export interface RepositoryInfo {
  /** Absolute path to repository */
  path: string
  /** Repository name */
  name: string
  /** Remote URL if available */
  remote?: string
  /** Current branch */
  branch: string
  /** Default branch */
  defaultBranch?: string
  /** Total number of commits */
  totalCommits: number
  /** Date of first commit */
  firstCommitDate: Date
  /** Date of most recent commit */
  lastCommitDate: Date
  /** Repository size in bytes */
  sizeBytes?: number
}

export interface GitAuthor {
  /** Author name */
  name: string
  /** Author email */
  email: string
  /** Aliases (other emails/names) */
  aliases?: string[]
}

export interface GitTag {
  /** Tag name */
  name: string
  /** Commit SHA the tag points to */
  sha: string
  /** Tag message if annotated */
  message?: string
  /** Tagger information if annotated */
  tagger?: GitAuthor
  /** Tag date if annotated */
  date?: Date
}

export interface GitBranch {
  /** Branch name */
  name: string
  /** Current commit SHA */
  sha: string
  /** Is this the current branch */
  isCurrent: boolean
  /** Is this a remote branch */
  isRemote: boolean
  /** Tracking information */
  tracking?: {
    remote: string
    branch: string
    ahead: number
    behind: number
  }
}