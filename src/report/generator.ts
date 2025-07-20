import { basename, resolve } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { parseCommitHistory, getGitHubUrl, getCurrentFiles, type CacheOptions } from '../git/parser.js'
import { getContributorStats, getLowestAverageLinesChanged, getHighestAverageLinesChanged, type ContributorStats } from '../data/contributor-calculator.js'
import { getFileTypeStats, getFileHeatData, type FileTypeStats } from '../data/file-calculator.js'
import { 
  getTopCommitsByFilesModified,
  getTopCommitsByBytesAdded,
  getTopCommitsByBytesRemoved,
  getTopCommitsByLinesAdded,
  getTopCommitsByLinesRemoved
} from '../data/award-calculator.js'
import { getTopFilesStats } from '../data/top-files-calculator.js'
import { checkLizardInstalled } from '../data/lizard-complexity-analyzer.js'
import { getTimeSeriesData, getLinearSeriesData } from '../chart/data-transformer.js'
import { processCommitMessages } from '../text/processor.js'
import { replaceTemplateVariables, injectIntoBody } from '../utils/template-engine.js'
import { bundlePageScript } from '../build/bundle-page-script.js'
import type { CommitData } from '../git/parser.js'
import type { ProgressReporter } from '../utils/progress-reporter.js'

export async function generateReport(repoPath: string, outputMode: 'dist' | 'analysis' = 'dist', progressReporter?: ProgressReporter, maxCommits?: number, customFilename?: string, cacheOptions?: CacheOptions): Promise<string> {
  const commits = await parseCommitHistory(repoPath, progressReporter, maxCommits, cacheOptions)
  const repoName = repoPath === '.' ? basename(process.cwd()) : basename(repoPath) || 'repo'
  
  // Check if Lizard is installed early
  const isLizardInstalled = await checkLizardInstalled()
  if (!isLizardInstalled) {
    console.warn('⚠️  Lizard not found. Code complexity analysis will be skipped. Install with: pip install lizard')
  }
  
  let outputDir: string
  let reportPath: string
  let statsPath: string | null = null
  
  const getFilename = (filename: string) => {
    return filename.endsWith('.html') ? filename : `${filename}.html`
  }
  
  if (outputMode === 'analysis') {
    outputDir = `analysis/${repoName}`
    reportPath = customFilename ? `${outputDir}/${getFilename(customFilename)}` : `${outputDir}/${repoName}.html`
    statsPath = `${outputDir}/repo-stats.json`
  } else {
    outputDir = outputMode
    reportPath = customFilename ? `${outputDir}/${getFilename(customFilename)}` : `${outputDir}/${repoName}.html`
  }
  
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }
  
  progressReporter?.report('Loading report template')
  const template = await readFile('src/report/template.html', 'utf-8')
  
  progressReporter?.report('Getting current files')
  const currentFiles = await getCurrentFiles(repoPath)

  progressReporter?.report('Calculating statistics')
  const chartData = await transformCommitData(commits, repoName, repoPath, progressReporter, isLizardInstalled, currentFiles)
  
  // Calculate all statistics once
  progressReporter?.report('Calculating contributor and file statistics')
  const contributors = getContributorStats(commits)
  const fileTypes = getFileTypeStats(commits, currentFiles)
  
  progressReporter?.report('Generating HTML report')
  const html = await injectDataIntoTemplate(template, chartData, commits, currentFiles, contributors, fileTypes, repoPath, progressReporter)
  
  progressReporter?.report('Writing report file')
  await writeFile(reportPath, html)
  
  if (statsPath) {
    progressReporter?.report('Writing statistics file')
    const stats = {
      repository: repoName,
      generatedAt: new Date().toISOString(),
      totalCommits: commits.length,
      totalLinesAdded: commits.reduce((sum, c) => sum + c.linesAdded, 0),
      totalLinesDeleted: commits.reduce((sum, c) => sum + c.linesDeleted, 0),
      contributors: contributors,
      fileTypes: fileTypes,
      commits: commits
    }
    await writeFile(statsPath, JSON.stringify(stats, null, 2))
  }
  
  progressReporter?.report('Report generation complete')
  progressReporter?.report(`Report saved to: ${reportPath}`)
  
  return resolve(reportPath)
}

interface TrophySvgs {
  contributors: string
  files: string
  bytesAdded: string
  bytesRemoved: string
  linesAdded: string
  linesRemoved: string
  averageLow: string
  averageHigh: string
}

interface ChartData {
  repositoryName: string
  totalCommits: number
  totalLinesOfCode: number
  totalContributors: number
  activeDays: number
  generationDate: string
  githubLink: string
  logoSvg: string
  trophySvgs: TrophySvgs
  isLizardInstalled: boolean
}

function formatFullDate(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });
}

async function transformCommitData(commits: CommitData[], repoName: string, repoPath: string, progressReporter?: ProgressReporter, isLizardInstalled: boolean = true, currentFiles?: Set<string>): Promise<ChartData> {
  // Calculate current lines of code from file size history
  let totalLinesOfCode = 0
  if (currentFiles && currentFiles.size > 0) {
    const fileSizeMap = new Map<string, number>()
    
    // Build up file sizes from commit history
    for (const commit of commits) {
      for (const fileChange of commit.filesChanged) {
        if (currentFiles.has(fileChange.fileName)) {
          const currentSize = fileSizeMap.get(fileChange.fileName) ?? 0
          const sizeChange = fileChange.linesAdded - fileChange.linesDeleted
          fileSizeMap.set(fileChange.fileName, Math.max(0, currentSize + sizeChange))
        }
      }
    }
    
    // Sum up all current file sizes
    totalLinesOfCode = Array.from(fileSizeMap.values()).reduce((sum, size) => sum + size, 0)
  } else {
    // Fallback to total lines added if we can't determine current files
    totalLinesOfCode = commits.reduce((sum, c) => sum + c.linesAdded, 0)
  }
  
  // Calculate unique contributors
  const uniqueContributors = new Set(commits.map(c => c.authorEmail)).size
  
  // Calculate active days (unique dates with commits)
  const uniqueDates = new Set(commits.map(c => c.date.split('T')[0]))
  const activeDays = uniqueDates.size
  
  progressReporter?.report('Loading image assets')
  const logoSvg = await readFile('src/images/logo.svg', 'utf-8')
  const trophySvgs = {
    contributors: await readFile('src/images/trophy-contributors.svg', 'utf-8'),
    files: await readFile('src/images/trophy-files.svg', 'utf-8'),
    bytesAdded: await readFile('src/images/trophy-bytes-added.svg', 'utf-8'),
    bytesRemoved: await readFile('src/images/trophy-bytes-removed.svg', 'utf-8'),
    linesAdded: await readFile('src/images/trophy-lines-added.svg', 'utf-8'),
    linesRemoved: await readFile('src/images/trophy-lines-removed.svg', 'utf-8'),
    averageLow: await readFile('src/images/trophy-average-low.svg', 'utf-8'),
    averageHigh: await readFile('src/images/trophy-average-high.svg', 'utf-8')
  }
  
  const githubUrl = await getGitHubUrl(repoPath)
  
  return {
    repositoryName: repoName,
    totalCommits: commits.length,
    totalLinesOfCode,
    totalContributors: uniqueContributors,
    activeDays,
    generationDate: formatFullDate(new Date()),
    githubLink: githubUrl ? ` • <a href="${githubUrl}" target="_blank" class="text-decoration-none">GitHub</a>` : '',
    logoSvg,
    trophySvgs,
    isLizardInstalled
  }
}

async function injectDataIntoTemplate(template: string, chartData: ChartData, commits: CommitData[], currentFiles: Set<string>, contributors: ContributorStats[], fileTypes: FileTypeStats[], repoPath: string, progressReporter?: ProgressReporter): Promise<string> {
  
  progressReporter?.report('Generating chart data')
  const timeSeries = getTimeSeriesData(commits)
  const linearSeries = getLinearSeriesData(commits)
  const wordCloudData = processCommitMessages(commits.map(c => c.message))
  const fileHeatData = getFileHeatData(commits, currentFiles)
  const topFilesData = await getTopFilesStats(commits, repoPath, currentFiles)
  
  progressReporter?.report('Calculating awards')
  // Calculate awards
  const awards = {
    filesModified: getTopCommitsByFilesModified(commits),
    bytesAdded: getTopCommitsByBytesAdded(commits),
    bytesRemoved: getTopCommitsByBytesRemoved(commits),
    linesAdded: getTopCommitsByLinesAdded(commits),
    linesRemoved: getTopCommitsByLinesRemoved(commits),
    lowestAverage: getLowestAverageLinesChanged(commits),
    highestAverage: getHighestAverageLinesChanged(commits)
  }
  
  // Bundle the TypeScript page script
  const bundledScript = await bundlePageScript()
  
  const chartScript = `
    <script>
      ${bundledScript}
      
      // Initialize the page script with data
      const pageData = {
        commits: ${JSON.stringify(commits)},
        contributors: ${JSON.stringify(contributors)},
        fileTypes: ${JSON.stringify(fileTypes)},
        timeSeries: ${JSON.stringify(timeSeries)},
        linearSeries: ${JSON.stringify(linearSeries)},
        wordCloudData: ${JSON.stringify(wordCloudData)},
        fileHeatData: ${JSON.stringify(fileHeatData)},
        topFilesData: ${JSON.stringify(topFilesData)},
        awards: ${JSON.stringify(awards)},
        trophySvgs: ${JSON.stringify(chartData.trophySvgs)},
        githubUrl: ${JSON.stringify(await getGitHubUrl(repoPath))},
        isLizardInstalled: ${JSON.stringify(chartData.isLizardInstalled)}
      };
      
      // Initialize when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          window.initializePageScript(pageData);
        });
      } else {
        window.initializePageScript(pageData);
      }
    </script>
  `
  
  const latestCommit = commits[commits.length - 1]

  const templateWithData = replaceTemplateVariables(template, {
    repositoryName: chartData.repositoryName,
    generationDate: chartData.generationDate,
    totalCommits: chartData.totalCommits.toString(),
    totalLinesOfCode: chartData.totalLinesOfCode.toString(),
    totalContributors: chartData.totalContributors.toString(),
    activeDays: chartData.activeDays.toString(),
    githubLink: chartData.githubLink,
    logoSvg: chartData.logoSvg,
    latestCommitHash: latestCommit ? latestCommit.sha.substring(0, 7) : 'N/A',
    latestCommitAuthor: latestCommit ? latestCommit.authorName : 'N/A',
    latestCommitDate: latestCommit ? formatFullDate(new Date(latestCommit.date)) : 'N/A'
  })
  
  return injectIntoBody(templateWithData, chartScript)
}
