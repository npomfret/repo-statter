import type { CommitData } from '../git/parser.js'
import type { RepoStatterConfig } from '../config/schema.js'

export interface FileTypeStats {
  type: string
  lines: number
  percentage: number
}

export interface FileHeatData {
  fileName: string
  heatScore: number
  commitCount: number
  lastModified: string
  totalLines: number
  fileType: string
}

export function getFileTypeStats(commits: CommitData[], currentFiles: Set<string> | undefined, config: RepoStatterConfig): FileTypeStats[] {
  const fileTypeMap = new Map<string, number>()
  
  for (const commit of commits) {
    for (const fileChange of commit.filesChanged) {
      // If currentFiles is provided, only include files that still exist
      if (currentFiles && !currentFiles.has(fileChange.fileName)) {
        continue
      }
      
      const existing = fileTypeMap.get(fileChange.fileType) ?? 0
      fileTypeMap.set(fileChange.fileType, existing + fileChange.linesAdded)
    }
  }
  
  const total = Array.from(fileTypeMap.values()).reduce((sum, lines) => sum + lines, 0)
  
  return Array.from(fileTypeMap.entries())
    .map(([type, lines]) => ({
      type,
      lines,
      percentage: total > 0 ? (lines / total) * 100 : 0
    }))
    .sort((a, b) => b.lines - a.lines)
}

export function getFileHeatData(commits: CommitData[], currentFiles: Set<string> | undefined, config: RepoStatterConfig): FileHeatData[] {
  const recencyDecayDays = config.fileHeat.recencyDecayDays
  const frequencyWeight = config.fileHeat.frequencyWeight
  const recencyWeight = config.fileHeat.recencyWeight
  const maxFilesDisplayed = config.fileHeat.maxFilesDisplayed

  const fileMap = new Map<string, { commitCount: number; lastModified: Date; totalLines: number; fileType: string }>()
  
  for (const commit of commits) {
    const commitDate = new Date(commit.date)
    
    for (const fileChange of commit.filesChanged) {
      // If currentFiles is provided, only include files that still exist
      if (currentFiles && !currentFiles.has(fileChange.fileName)) {
        continue
      }
      
      const existing = fileMap.get(fileChange.fileName)
      
      if (!existing) {
        fileMap.set(fileChange.fileName, {
          commitCount: 1,
          lastModified: commitDate,
          totalLines: fileChange.linesAdded - fileChange.linesDeleted,
          fileType: fileChange.fileType
        })
      } else {
        existing.commitCount += 1
        existing.totalLines += fileChange.linesAdded - fileChange.linesDeleted
        if (commitDate > existing.lastModified) {
          existing.lastModified = commitDate
        }
      }
    }
  }
  
  const now = new Date()
  const results: FileHeatData[] = []
  
  for (const [fileName, data] of fileMap.entries()) {
    const daysSinceLastModification = (now.getTime() - data.lastModified.getTime()) / (1000 * 60 * 60 * 24)
    const frequency = data.commitCount
    const recency = Math.exp(-daysSinceLastModification / recencyDecayDays)
    const heatScore = (frequency * frequencyWeight) + (recency * recencyWeight)
    
    results.push({
      fileName,
      heatScore,
      commitCount: data.commitCount,
      lastModified: data.lastModified.toISOString(),
      totalLines: Math.max(data.totalLines, 1),
      fileType: data.fileType
    })
  }
  
  return results
    .sort((a, b) => b.heatScore - a.heatScore)
    .slice(0, maxFilesDisplayed)
}