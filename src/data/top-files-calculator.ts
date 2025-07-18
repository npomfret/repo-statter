import type { CommitData } from '../git/parser.js'

export interface TopFileStats {
  fileName: string
  value: number
  percentage: number
}

export interface TopFilesData {
  largest: TopFileStats[]
  mostChurn: TopFileStats[]
  mostComplex: TopFileStats[]
}

export function getTopFilesBySize(commits: CommitData[], currentFiles?: Set<string>): TopFileStats[] {
  const fileSizeMap = new Map<string, number>()
  
  for (const commit of commits) {
    for (const fileChange of commit.filesChanged) {
      // If currentFiles is provided, only include files that still exist
      if (currentFiles && !currentFiles.has(fileChange.fileName)) {
        continue
      }
      
      const currentSize = fileSizeMap.get(fileChange.fileName) ?? 0
      const sizeChange = fileChange.linesAdded - fileChange.linesDeleted
      fileSizeMap.set(fileChange.fileName, currentSize + sizeChange)
    }
  }
  
  // Filter out files with negative or zero size
  const positiveFiles = Array.from(fileSizeMap.entries())
    .filter(([_, size]) => size > 0)
    .map(([fileName, size]) => ({ fileName, size }))
  
  // Sort by size descending and take top 5
  const topFiles = positiveFiles
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
  
  const total = topFiles.reduce((sum, file) => sum + file.size, 0)
  
  return topFiles.map(file => ({
    fileName: file.fileName,
    value: file.size,
    percentage: total > 0 ? (file.size / total) * 100 : 0
  }))
}

export function getTopFilesByChurn(commits: CommitData[], currentFiles?: Set<string>): TopFileStats[] {
  const fileChurnMap = new Map<string, number>()
  
  for (const commit of commits) {
    for (const fileChange of commit.filesChanged) {
      // If currentFiles is provided, only include files that still exist
      if (currentFiles && !currentFiles.has(fileChange.fileName)) {
        continue
      }
      
      const currentChurn = fileChurnMap.get(fileChange.fileName) ?? 0
      const churn = fileChange.linesAdded + fileChange.linesDeleted
      fileChurnMap.set(fileChange.fileName, currentChurn + churn)
    }
  }
  
  // Sort by churn descending and take top 5
  const topFiles = Array.from(fileChurnMap.entries())
    .map(([fileName, churn]) => ({ fileName, churn }))
    .sort((a, b) => b.churn - a.churn)
    .slice(0, 5)
  
  const total = topFiles.reduce((sum, file) => sum + file.churn, 0)
  
  return topFiles.map(file => ({
    fileName: file.fileName,
    value: file.churn,
    percentage: total > 0 ? (file.churn / total) * 100 : 0
  }))
}

export function getTopFilesStats(commits: CommitData[], currentFiles?: Set<string>): TopFilesData {
  return {
    largest: getTopFilesBySize(commits, currentFiles),
    mostChurn: getTopFilesByChurn(commits, currentFiles),
    mostComplex: [] // Empty for now, to be implemented later
  }
}