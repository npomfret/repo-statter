import { createHash } from 'crypto'
import { tmpdir } from 'os'
import { join } from 'path'
import { readFile, writeFile, mkdir, access, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { simpleGit } from 'simple-git'
import type { CommitData } from '../git/parser.js'

export interface CacheData {
  version: string
  repositoryHash: string
  lastCommitSha: string
  cachedAt: string
  commits: CommitData[]
  isPartialCache?: boolean
  maxCommitsUsed?: number
}


export async function generateRepositoryHash(repoPath: string): Promise<string> {
  const inputs: string[] = []
  inputs.push(repoPath)
  
  try {
    const git = simpleGit(repoPath)
    
    try {
      const remotes = await git.getRemotes(true)
      const origin = remotes.find(r => r.name === 'origin')
      if (origin?.refs.fetch) {
        inputs.push(origin.refs.fetch)
      }
    } catch {
      // Ignore remote errors
    }
    
    try {
      const firstCommit = await git.raw(['rev-list', '--max-parents=0', 'HEAD'])
      inputs.push(firstCommit.trim())
    } catch {
      // Ignore if no commits
    }
  } catch {
    // If git fails entirely (non-existent directory), just use the path
  }
  
  const combined = inputs.join('|')
  return createHash('sha256').update(combined).digest('hex').substring(0, 16)
}

export function getCachePath(repositoryHash: string, cacheDirName: string): string {
  const cacheDir = join(tmpdir(), cacheDirName)
  return join(cacheDir, `${repositoryHash}.json`)
}

export async function ensureCacheDirectory(cacheDirName: string): Promise<void> {
  const cacheDir = join(tmpdir(), cacheDirName)
  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true })
  }
}

export async function loadCache(repositoryHash: string, cacheVersion: string, cacheDirName: string, maxCommits?: number): Promise<CacheData | null> {
  const cachePath = getCachePath(repositoryHash, cacheDirName)
  
  try {
    await access(cachePath)
    const content = await readFile(cachePath, 'utf-8')
    const cacheData: CacheData = JSON.parse(content)
    
    if (cacheData.version !== cacheVersion) {
      return null
    }
    
    if (cacheData.repositoryHash !== repositoryHash) {
      return null
    }
    
    // If cache is partial, only use it if it matches the requested commit count
    if (cacheData.isPartialCache) {
      if (!maxCommits || maxCommits !== cacheData.maxCommitsUsed) {
        return null  // Force fresh analysis
      }
    }
    
    // If cache is full but user wants partial, don't use cache
    if (!cacheData.isPartialCache && maxCommits) {
      return null  // Force fresh analysis
    }
    
    return cacheData
  } catch {
    return null
  }
}

export async function saveCache(repositoryHash: string, commits: CommitData[], cacheVersion: string, cacheDirName: string, maxCommits?: number): Promise<void> {
  await ensureCacheDirectory(cacheDirName)
  
  const lastCommit = commits[commits.length - 1]
  const cacheData: CacheData = {
    version: cacheVersion,
    repositoryHash,
    lastCommitSha: lastCommit?.sha || '',
    cachedAt: new Date().toISOString(),
    commits,
    ...(maxCommits && {
      isPartialCache: true,
      maxCommitsUsed: maxCommits
    })
  }
  
  const cachePath = getCachePath(repositoryHash, cacheDirName)
  await writeFile(cachePath, JSON.stringify(cacheData, null, 2))
}

export async function clearCache(repositoryHash: string, cacheDirName: string): Promise<void> {
  const cachePath = getCachePath(repositoryHash, cacheDirName)
  try {
    await unlink(cachePath)
  } catch {
    // Ignore if file doesn't exist
  }
}

export async function isCacheValid(repositoryHash: string, cacheVersion: string, cacheDirName: string, maxCommits?: number): Promise<boolean> {
  const cache = await loadCache(repositoryHash, cacheVersion, cacheDirName, maxCommits)
  return cache !== null && cache.commits.length > 0
}