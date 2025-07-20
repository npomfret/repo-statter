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
}

const CACHE_VERSION = '1.0'
const CACHE_DIR_NAME = 'repo-statter-cache'

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

export function getCachePath(repositoryHash: string): string {
  const cacheDir = join(tmpdir(), CACHE_DIR_NAME)
  return join(cacheDir, `${repositoryHash}.json`)
}

export async function ensureCacheDirectory(): Promise<void> {
  const cacheDir = join(tmpdir(), CACHE_DIR_NAME)
  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true })
  }
}

export async function loadCache(repositoryHash: string): Promise<CacheData | null> {
  const cachePath = getCachePath(repositoryHash)
  
  try {
    await access(cachePath)
    const content = await readFile(cachePath, 'utf-8')
    const cacheData: CacheData = JSON.parse(content)
    
    if (cacheData.version !== CACHE_VERSION) {
      return null
    }
    
    if (cacheData.repositoryHash !== repositoryHash) {
      return null
    }
    
    return cacheData
  } catch {
    return null
  }
}

export async function saveCache(repositoryHash: string, commits: CommitData[]): Promise<void> {
  await ensureCacheDirectory()
  
  const lastCommit = commits[commits.length - 1]
  const cacheData: CacheData = {
    version: CACHE_VERSION,
    repositoryHash,
    lastCommitSha: lastCommit?.sha || '',
    cachedAt: new Date().toISOString(),
    commits
  }
  
  const cachePath = getCachePath(repositoryHash)
  await writeFile(cachePath, JSON.stringify(cacheData, null, 2))
}

export async function clearCache(repositoryHash: string): Promise<void> {
  const cachePath = getCachePath(repositoryHash)
  try {
    await unlink(cachePath)
  } catch {
    // Ignore if file doesn't exist
  }
}

export async function isCacheValid(repositoryHash: string): Promise<boolean> {
  const cache = await loadCache(repositoryHash)
  return cache !== null && cache.commits.length > 0
}