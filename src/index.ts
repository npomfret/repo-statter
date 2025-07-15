import { simpleGit } from 'simple-git'
import { extname, basename } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

export interface FileChange {
  fileName: string
  linesAdded: number
  linesDeleted: number
  fileType: string
}

export interface CommitData {
  sha: string
  authorName: string
  authorEmail: string
  date: string
  message: string
  linesAdded: number
  linesDeleted: number
  filesChanged: FileChange[]
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
  
  const commits: CommitData[] = []
  
  for (const commit of log.all) {
    const diffStats = await parseCommitDiff(repoPath, commit.hash)
    
    commits.push({
      sha: commit.hash,
      authorName: commit.author_name,
      authorEmail: commit.author_email,
      date: commit.date,
      message: commit.message,
      linesAdded: diffStats.linesAdded,
      linesDeleted: diffStats.linesDeleted,
      filesChanged: diffStats.filesChanged
    })
  }
  
  return commits
}

function getFileType(fileName: string): string {
  const ext = extname(fileName).toLowerCase()
  switch (ext) {
    case '.ts':
    case '.tsx':
      return 'TypeScript'
    case '.js':
    case '.jsx':
      return 'JavaScript'
    case '.css':
      return 'CSS'
    case '.scss':
    case '.sass':
      return 'SCSS'
    case '.html':
      return 'HTML'
    case '.json':
      return 'JSON'
    case '.md':
      return 'Markdown'
    case '.py':
      return 'Python'
    case '.java':
      return 'Java'
    case '.cpp':
    case '.cc':
    case '.cxx':
      return 'C++'
    case '.c':
      return 'C'
    case '.go':
      return 'Go'
    case '.rs':
      return 'Rust'
    case '.php':
      return 'PHP'
    case '.rb':
      return 'Ruby'
    case '.swift':
      return 'Swift'
    case '.kt':
      return 'Kotlin'
    default:
      return ext || 'Other'
  }
}

async function parseCommitDiff(repoPath: string, commitHash: string): Promise<{ linesAdded: number; linesDeleted: number; filesChanged: FileChange[] }> {
  const git = simpleGit(repoPath)
  
  try {
    const diffSummary = await git.diffSummary([commitHash + '^!'])
    
    const filesChanged: FileChange[] = diffSummary.files.map(file => ({
      fileName: file.file,
      linesAdded: 'insertions' in file ? file.insertions : 0,
      linesDeleted: 'deletions' in file ? file.deletions : 0,
      fileType: getFileType(file.file)
    }))
    
    const linesAdded = diffSummary.insertions
    const linesDeleted = diffSummary.deletions
    
    return { linesAdded, linesDeleted, filesChanged }
  } catch (error) {
    return { linesAdded: 0, linesDeleted: 0, filesChanged: [] }
  }
}

export const VERSION = '1.0.0' as const

if (process.argv[1]?.endsWith('index.ts')) {
  const args = process.argv.slice(2)
  
  if (args.includes('--repo')) {
    const repoIndex = args.indexOf('--repo')
    const repoPath = args[repoIndex + 1]
    
    if (!repoPath) {
      console.error('Error: --repo requires a path argument')
      console.error('Usage: npm run analyse -- --repo /path/to/repository')
      process.exit(1)
    }
    
    if (!existsSync(repoPath)) {
      console.error(`Error: Repository path does not exist: ${repoPath}`)
      process.exit(1)
    }
    
    generateReport(repoPath, 'analysis').catch(error => {
      console.error('Error generating report:', error)
      process.exit(1)
    })
  } else if (args.length > 0 && args[0]) {
    generateReport(args[0], 'dist').catch(error => {
      console.error('Error generating report:', error)
      process.exit(1)
    })
  } else {
    console.error('Usage:')
    console.error('  npm run build <repo-path>')
    console.error('  npm run analyse -- --repo <repo-path>')
    process.exit(1)
  }
}

export async function generateReport(repoPath: string, outputMode: 'dist' | 'analysis' = 'dist'): Promise<void> {
  const commits = await parseCommitHistory(repoPath)
  const repoName = basename(repoPath) || 'repo'
  
  let outputDir: string
  let reportPath: string
  let statsPath: string | null = null
  
  if (outputMode === 'analysis') {
    outputDir = `analysis/${repoName}`
    reportPath = `${outputDir}/report.html`
    statsPath = `${outputDir}/repo-stats.json`
  } else {
    outputDir = 'dist'
    reportPath = `${outputDir}/report.html`
  }
  
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }
  
  const template = await readFile('src/report/template.html', 'utf-8')
  const chartData = await transformCommitData(commits, repoName, repoPath)
  
  const html = injectDataIntoTemplate(template, chartData, commits)
  await writeFile(reportPath, html)
  
  if (statsPath) {
    const stats = {
      repository: repoName,
      generatedAt: new Date().toISOString(),
      totalCommits: commits.length,
      totalLinesAdded: commits.reduce((sum, c) => sum + c.linesAdded, 0),
      totalLinesDeleted: commits.reduce((sum, c) => sum + c.linesDeleted, 0),
      contributors: getContributorStats(commits),
      fileTypes: getFileTypeStats(commits),
      commits: commits
    }
    await writeFile(statsPath, JSON.stringify(stats, null, 2))
  }
  
  console.log(`Report generated: ${reportPath}`)
  if (statsPath) {
    console.log(`Stats saved: ${statsPath}`)
  }
  console.log(`Repository: ${repoName}`)
  console.log(`Total commits: ${commits.length}`)
  console.log(`Total lines added: ${commits.reduce((sum, c) => sum + c.linesAdded, 0)}`)
}

async function getGitHubUrl(repoPath: string): Promise<string | null> {
  const git = simpleGit(repoPath)
  try {
    const remotes = await git.getRemotes(true)
    const origin = remotes.find(r => r.name === 'origin')
    if (origin && origin.refs.fetch) {
      const match = origin.refs.fetch.match(/github\.com[:/](.+?)(?:\.git)?$/)
      if (match) {
        return `https://github.com/${match[1]}`
      }
    }
  } catch (error) {
    // Silent fail - not all repos have GitHub remotes
  }
  return null
}

async function transformCommitData(commits: CommitData[], repoName: string, repoPath: string) {
  const totalCommits = commits.length
  const totalLinesOfCode = commits.reduce((sum, commit) => sum + commit.linesAdded, 0)
  const totalCodeChurn = commits.reduce((sum, commit) => sum + commit.linesAdded + commit.linesDeleted, 0)
  
  const contributors = getContributorStats(commits)
  const topContributor = contributors[0]?.name || 'Unknown'
  
  const githubUrl = await getGitHubUrl(repoPath)
  const githubLink = githubUrl ? ` • <a href="${githubUrl}" target="_blank" class="text-decoration-none">View on GitHub</a>` : ''
  
  return {
    repositoryName: repoName,
    totalCommits,
    totalLinesOfCode,
    totalCodeChurn,
    topContributor,
    generationDate: new Date().toLocaleDateString(),
    githubLink
  }
}

function getContributorStats(commits: CommitData[]) {
  const contributorMap = new Map<string, { name: string; commits: number; linesAdded: number; linesDeleted: number }>()
  
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

function getFileTypeStats(commits: CommitData[]) {
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

function getTimeSeriesData(commits: CommitData[]) {
  const timeSeriesMap = new Map<string, { date: string; commits: number; linesAdded: number; linesDeleted: number; cumulativeLines: number }>()
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

function injectDataIntoTemplate(template: string, chartData: any, commits: CommitData[]): string {
  const contributors = getContributorStats(commits)
  const fileTypes = getFileTypeStats(commits)
  const timeSeries = getTimeSeriesData(commits)
  
  const chartScript = `
    <script>
      const commits = ${JSON.stringify(commits)};
      const contributors = ${JSON.stringify(contributors)};
      const fileTypes = ${JSON.stringify(fileTypes)};
      const timeSeries = ${JSON.stringify(timeSeries)};
      
      function renderCommitActivityChart() {
        const options = {
          chart: { type: 'area', height: 350, toolbar: { show: false } },
          series: [{ name: 'Commits', data: timeSeries.map(point => ({ x: point.date, y: point.commits })) }],
          xaxis: { type: 'datetime', title: { text: 'Date' } },
          yaxis: { title: { text: 'Commits' } },
          fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
          colors: ['#0d6efd']
        };
        new ApexCharts(document.querySelector('#commitActivityChart'), options).render();
      }
      
      function renderContributorsChart() {
        const options = {
          chart: { type: 'bar', height: 350, toolbar: { show: false } },
          series: [{ name: 'Commits', data: contributors.slice(0, 10).map(c => c.commits) }],
          xaxis: { categories: contributors.slice(0, 10).map(c => c.name), title: { text: 'Contributors' } },
          yaxis: { title: { text: 'Commits' } },
          colors: ['#198754']
        };
        new ApexCharts(document.querySelector('#contributorsChart'), options).render();
      }
      
      function renderLinesOfCodeChart() {
        const options = {
          chart: { type: 'area', height: 350, toolbar: { show: false } },
          series: [{ name: 'Lines of Code', data: timeSeries.map(point => ({ x: point.date, y: point.cumulativeLines })) }],
          xaxis: { type: 'datetime', title: { text: 'Date' } },
          yaxis: { title: { text: 'Lines of Code' } },
          fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
          colors: ['#dc3545']
        };
        new ApexCharts(document.querySelector('#linesOfCodeChart'), options).render();
      }
      
      function renderFileTypesChart() {
        const options = {
          chart: { type: 'donut', height: 350 },
          series: fileTypes.slice(0, 8).map(ft => ft.lines),
          labels: fileTypes.slice(0, 8).map(ft => ft.type),
          colors: ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#6f42c1', '#20c997', '#fd7e14', '#6c757d']
        };
        new ApexCharts(document.querySelector('#fileTypesChart'), options).render();
      }
      
      function renderCodeChurnChart() {
        const options = {
          chart: { type: 'area', height: 350, toolbar: { show: false }, stacked: true },
          series: [
            { name: 'Lines Added', data: timeSeries.map(point => ({ x: point.date, y: point.linesAdded })) },
            { name: 'Lines Deleted', data: timeSeries.map(point => ({ x: point.date, y: point.linesDeleted })) }
          ],
          xaxis: { type: 'datetime', title: { text: 'Date' } },
          yaxis: { title: { text: 'Lines Changed' } },
          fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
          colors: ['#28a745', '#dc3545'],
          tooltip: { shared: true }
        };
        new ApexCharts(document.querySelector('#codeChurnChart'), options).render();
      }
      
      document.addEventListener('DOMContentLoaded', function() {
        renderCommitActivityChart();
        renderContributorsChart();
        renderLinesOfCodeChart();
        renderFileTypesChart();
        renderCodeChurnChart();
      });
    </script>
  `;
  
  return template
    .replace(/{{repositoryName}}/g, chartData.repositoryName)
    .replace(/{{generationDate}}/g, chartData.generationDate)
    .replace(/{{totalCommits}}/g, chartData.totalCommits.toString())
    .replace(/{{totalLinesOfCode}}/g, chartData.totalLinesOfCode.toString())
    .replace(/{{totalCodeChurn}}/g, chartData.totalCodeChurn.toString())
    .replace(/{{topContributor}}/g, chartData.topContributor)
    .replace(/{{githubLink}}/g, chartData.githubLink)
    .replace('</body>', chartScript + '\n</body>')
}