import ApexCharts from 'apexcharts'
import type { CommitData } from '../index.js'

export interface ChartData {
  repositoryName: string
  totalCommits: number
  totalLinesOfCode: number
  topContributor: string
  commits: CommitData[]
}

export interface ContributorStats {
  name: string
  commits: number
  linesAdded: number
  linesDeleted: number
}

export interface FileTypeStats {
  type: string
  lines: number
  percentage: number
}

export interface TimeSeriesPoint {
  date: string
  commits: number
  linesAdded: number
  linesDeleted: number
  cumulativeLines: number
}

export function transformCommitData(commits: CommitData[]): ChartData {
  const totalCommits = commits.length
  const totalLinesOfCode = commits.reduce((sum, commit) => sum + commit.linesAdded, 0)
  
  const contributors = getContributorStats(commits)
  const topContributor = contributors[0]?.name || 'Unknown'
  
  return {
    repositoryName: 'Repository',
    totalCommits,
    totalLinesOfCode,
    topContributor,
    commits
  }
}

export function getContributorStats(commits: CommitData[]): ContributorStats[] {
  const contributorMap = new Map<string, ContributorStats>()
  
  for (const commit of commits) {
    if (!contributorMap.has(commit.authorName)) {
      contributorMap.set(commit.authorName, {
        name: commit.authorName,
        commits: 0,
        linesAdded: 0,
        linesDeleted: 0
      })
    }
    
    const existing = contributorMap.get(commit.authorName)!
    existing.commits += 1
    existing.linesAdded += commit.linesAdded
    existing.linesDeleted += commit.linesDeleted
  }
  
  return Array.from(contributorMap.values())
    .sort((a, b) => b.commits - a.commits)
}

export function getFileTypeStats(commits: CommitData[]): FileTypeStats[] {
  const fileTypeMap = new Map<string, number>()
  
  for (const commit of commits) {
    for (const fileChange of commit.filesChanged) {
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

export function getTimeSeriesData(commits: CommitData[]): TimeSeriesPoint[] {
  const timeSeriesMap = new Map<string, TimeSeriesPoint>()
  let cumulativeLines = 0
  
  for (const commit of commits) {
    const date = new Date(commit.date).toISOString().split('T')[0]!
    
    if (!timeSeriesMap.has(date)) {
      timeSeriesMap.set(date, {
        date,
        commits: 0,
        linesAdded: 0,
        linesDeleted: 0,
        cumulativeLines: 0
      })
    }
    
    const existing = timeSeriesMap.get(date)!
    existing.commits += 1
    existing.linesAdded += commit.linesAdded
    existing.linesDeleted += commit.linesDeleted
    cumulativeLines += commit.linesAdded - commit.linesDeleted
    existing.cumulativeLines = cumulativeLines
  }
  
  return Array.from(timeSeriesMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function renderCommitActivityChart(elementId: string, data: TimeSeriesPoint[]): ApexCharts {
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: { show: false }
    },
    series: [{
      name: 'Commits',
      data: data.map(point => ({ x: point.date, y: point.commits }))
    }],
    xaxis: {
      type: 'datetime',
      title: { text: 'Date' }
    },
    yaxis: {
      title: { text: 'Commits' }
    },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 }
    },
    colors: ['#27aeef']
  }
  
  const element = (globalThis as any).document?.querySelector(`#${elementId}`)
  const chart = new ApexCharts(element, options)
  chart.render()
  return chart
}

export function renderContributorsChart(elementId: string, contributors: ContributorStats[]): ApexCharts {
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false }
    },
    series: [{
      name: 'Commits',
      data: contributors.slice(0, 10).map(c => c.commits)
    }],
    xaxis: {
      categories: contributors.slice(0, 10).map(c => c.name),
      title: { text: 'Contributors' }
    },
    yaxis: {
      title: { text: 'Commits' }
    },
    colors: ['#87bc45']
  }
  
  const element = (globalThis as any).document?.querySelector(`#${elementId}`)
  const chart = new ApexCharts(element, options)
  chart.render()
  return chart
}

export function renderLinesOfCodeChart(elementId: string, data: TimeSeriesPoint[]): ApexCharts {
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: { show: false }
    },
    series: [{
      name: 'Lines of Code',
      data: data.map(point => ({ x: point.date, y: point.cumulativeLines }))
    }],
    xaxis: {
      type: 'datetime',
      title: { text: 'Date' }
    },
    yaxis: {
      title: { text: 'Lines of Code' }
    },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 }
    },
    colors: ['#ea5545']
  }
  
  const element = (globalThis as any).document?.querySelector(`#${elementId}`)
  const chart = new ApexCharts(element, options)
  chart.render()
  return chart
}

export function renderFileTypesChart(elementId: string, fileTypes: FileTypeStats[]): ApexCharts {
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut',
      height: 350
    },
    series: fileTypes.slice(0, 8).map(ft => ft.lines),
    labels: fileTypes.slice(0, 8).map(ft => ft.type),
    colors: ['#27aeef', '#87bc45', '#ea5545', '#ef9b20', '#b33dc6', '#f46a9b', '#ede15b', '#bdcf32']
  }
  
  const element = (globalThis as any).document?.querySelector(`#${elementId}`)
  const chart = new ApexCharts(element, options)
  chart.render()
  return chart
}

export function renderAllCharts(commits: CommitData[]): void {
  const contributors = getContributorStats(commits)
  const fileTypes = getFileTypeStats(commits)
  const timeSeries = getTimeSeriesData(commits)
  
  renderCommitActivityChart('commitActivityChart', timeSeries)
  renderContributorsChart('contributorsChart', contributors)
  renderLinesOfCodeChart('linesOfCodeChart', timeSeries)
  renderFileTypesChart('fileTypesChart', fileTypes)
}