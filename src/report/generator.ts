import { basename } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { parseCommitHistory, getGitHubUrl, getCurrentFiles } from '../git/parser.js'
import { 
  getContributorStats, 
  getFileTypeStats, 
  getFileHeatData,
  getTopCommitsByFilesModified,
  getTopCommitsByBytesAdded,
  getTopCommitsByBytesRemoved,
  getTopCommitsByLinesAdded,
  getTopCommitsByLinesRemoved,
  getLowestAverageLinesChanged,
  getHighestAverageLinesChanged,
  getTopFilesStats
} from '../stats/calculator.js'
import { getTimeSeriesData, getLinearSeriesData } from '../chart/data-transformer.js'
import { processCommitMessages } from '../text/processor.js'
import { replaceTemplateVariables, injectIntoBody } from '../utils/template-engine.js'
import { bundlePageScript } from '../build/bundle-page-script.js'
import type { CommitData } from '../git/parser.js'
import type { ProgressReporter } from '../utils/progress-reporter.js'

export async function generateReport(repoPath: string, outputMode: 'dist' | 'analysis' = 'dist', progressReporter?: ProgressReporter): Promise<void> {
  const commits = await parseCommitHistory(repoPath, progressReporter)
  const repoName = repoPath === '.' ? basename(process.cwd()) : basename(repoPath) || 'repo'
  
  let outputDir: string
  let reportPath: string
  let statsPath: string | null = null
  
  if (outputMode === 'analysis') {
    outputDir = `analysis/${repoName}`
    reportPath = `${outputDir}/${repoName}.html`
    statsPath = `${outputDir}/repo-stats.json`
  } else {
    outputDir = 'dist'
    reportPath = `${outputDir}/${repoName}.html`
  }
  
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }
  
  progressReporter?.report('Loading report template')
  const template = await readFile('src/report/template.html', 'utf-8')
  
  progressReporter?.report('Getting current files')
  const currentFiles = await getCurrentFiles(repoPath)

  progressReporter?.report('Calculating statistics')
  const chartData = await transformCommitData(commits, repoName, repoPath, progressReporter)
  
  progressReporter?.report('Generating HTML report')
  const html = await injectDataIntoTemplate(template, chartData, commits, currentFiles, progressReporter)
  
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
      contributors: getContributorStats(commits),
      fileTypes: getFileTypeStats(commits, currentFiles),
      commits: commits
    }
    await writeFile(statsPath, JSON.stringify(stats, null, 2))
  }
  
  progressReporter?.report('Report generation complete')
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
  generationDate: string
  githubLink: string
  logoSvg: string
  trophySvgs: TrophySvgs
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

async function transformCommitData(commits: CommitData[], repoName: string, repoPath: string, progressReporter?: ProgressReporter): Promise<ChartData> {
  const totalLinesAdded = commits.reduce((sum, c) => sum + c.linesAdded, 0)
  const totalLinesOfCode = totalLinesAdded
  
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
    generationDate: formatFullDate(new Date()),
    githubLink: githubUrl ? ` • <a href="${githubUrl}" target="_blank" class="text-decoration-none">GitHub</a>` : '',
    logoSvg,
    trophySvgs
  }
}

async function injectDataIntoTemplate(template: string, chartData: ChartData, commits: CommitData[], currentFiles: Set<string>, progressReporter?: ProgressReporter): Promise<string> {
  progressReporter?.report('Calculating contributor statistics')
  const contributors = getContributorStats(commits)
  const fileTypes = getFileTypeStats(commits, currentFiles)
  
  progressReporter?.report('Generating chart data')
  const timeSeries = getTimeSeriesData(commits)
  const linearSeries = getLinearSeriesData(commits)
  const wordCloudData = processCommitMessages(commits.map(c => c.message))
  const fileHeatData = getFileHeatData(commits, currentFiles)
  const topFilesData = getTopFilesStats(commits, currentFiles)
  
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
        trophySvgs: ${JSON.stringify(chartData.trophySvgs)}
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
    githubLink: chartData.githubLink,
    logoSvg: chartData.logoSvg,
    latestCommitHash: latestCommit ? latestCommit.sha.substring(0, 7) : 'N/A',
    latestCommitAuthor: latestCommit ? latestCommit.authorName : 'N/A',
    latestCommitDate: latestCommit ? formatFullDate(new Date(latestCommit.date)) : 'N/A'
  })
  
  return injectIntoBody(templateWithData, chartScript)
}
