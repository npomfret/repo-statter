import { basename, resolve, dirname, join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
import { parseCommitHistory, getGitHubUrl, getCurrentFiles, getRepositoryName, type CacheOptions } from '../git/parser.js'
import { DataPipeline, type ProcessedData } from '../data/unified-pipeline.js'
import { checkLizardInstalled } from '../data/lizard-complexity-analyzer.js'
import { replaceTemplateVariables, injectIntoBody } from '../utils/template-engine.js'
import { bundleCharts } from '../build/bundle-charts.js'
import type { CommitData } from '../git/parser.js'
import type { ProgressReporter } from '../utils/progress-reporter.js'
import type { SimplifiedConfig } from '../config/simplified-schema.js'
import { DEFAULT_CONFIG } from '../config/defaults.js'
import { isFileExcluded } from '../utils/exclusions.js'

export interface AnalysisContext {
  repoPath: string
  repoName: string
  isLizardInstalled: boolean
  currentFiles: Set<string>
  commits: CommitData[]
  progressReporter?: ProgressReporter
  config: SimplifiedConfig
}

/**
 * Filter excluded files from commits based on exclusion patterns
 */
function filterExcludedFiles(commits: CommitData[], patterns: string[]): CommitData[] {
  return commits.map(commit => {
    const filteredFiles = commit.filesChanged.filter(file => !isFileExcluded(file.fileName, patterns));
    
    // Recalculate totals based on filtered files
    const linesAdded = filteredFiles.reduce((sum, file) => sum + file.linesAdded, 0);
    const linesDeleted = filteredFiles.reduce((sum, file) => sum + file.linesDeleted, 0);
    const bytesAdded = filteredFiles.reduce((sum, file) => sum + (file.bytesAdded ?? 0), 0);
    const bytesDeleted = filteredFiles.reduce((sum, file) => sum + (file.bytesDeleted ?? 0), 0);
    
    return {
      ...commit,
      filesChanged: filteredFiles,
      linesAdded,
      linesDeleted,
      // Only include bytesAdded/bytesDeleted if they exist in the original commit or have non-zero values
      ...(commit.bytesAdded !== undefined || bytesAdded > 0 ? { bytesAdded } : {}),
      ...(commit.bytesDeleted !== undefined || bytesDeleted > 0 ? { bytesDeleted } : {})
    };
  })
  // Filter out empty commits (commits with no files after exclusions)
  .filter(commit => commit.filesChanged.length > 0);
}

export async function generateReport(repoPath: string, outputMode: 'dist' | 'analysis' = 'dist', progressReporter?: ProgressReporter, maxCommits?: number, customFilename?: string, cacheOptions?: CacheOptions, config?: SimplifiedConfig): Promise<string> {
  // Use provided config or fall back to defaults
  const finalConfig = config || DEFAULT_CONFIG
  const rawCommits = await parseCommitHistory(repoPath, progressReporter, maxCommits, cacheOptions || {}, finalConfig)
  
  // Apply exclusion filters at runtime
  progressReporter?.report('Applying exclusion filters')
  const commits = filterExcludedFiles(rawCommits, finalConfig.exclusions.patterns)
  
  // Try to get repository name from git remote, fallback to directory name
  let repoName = await getRepositoryName(repoPath)
  if (!repoName) {
    repoName = repoPath === '.' ? basename(process.cwd()) : basename(repoPath) || 'repo'
  }
  
  // Check if Lizard is installed early
  const isLizardInstalled = await checkLizardInstalled()
  if (!isLizardInstalled) {
    console.warn('⚠️  Lizard not found. Code complexity analysis will be skipped. Install with: pip install lizard')
  }
  
  progressReporter?.report('Getting current files')
  const currentFiles = await getCurrentFiles(repoPath)
  
  // Create the analysis context
  const context: AnalysisContext = {
    repoPath,
    repoName,
    isLizardInstalled,
    currentFiles,
    commits,
    ...(progressReporter && { progressReporter }),
    config: finalConfig
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
  // In npm package: dist/report/generator.js -> src/report/template.html
  const templatePath = join(__dirname, '../../src/report/template.html')
  const template = await readFile(templatePath, 'utf-8')

  progressReporter?.report('Calculating statistics')
  const chartData = await transformCommitData(context)
  
  // Calculate all statistics using unified pipeline
  progressReporter?.report('Processing repository data')
  
  // Create unified pipeline instance and process all data
  const pipeline = new DataPipeline()
  const pipelineData = await pipeline.processRepository(context)
  
  progressReporter?.report('Generating HTML report')
  const html = await injectDataIntoTemplate(template, chartData, pipelineData, context)
  
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
      contributors: pipelineData.contributors,
      fileTypes: pipelineData.fileTypes,
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

interface ReportTemplateData {
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

async function transformCommitData(context: AnalysisContext): Promise<ReportTemplateData> {
  const { commits, repoName, repoPath, progressReporter, isLizardInstalled, currentFiles } = context
  
  // Calculate cumulative lines of code using the same method as the time series chart
  // This ensures consistency between the hero metric and the growth chart
  let totalLinesOfCode = 0
  
  if (commits.length > 0) {
    // Calculate cumulative lines of code directly from commits
    totalLinesOfCode = commits.reduce((total, commit) => {
      return total + commit.linesAdded - commit.linesDeleted
    }, 0)
    // Ensure non-negative
    totalLinesOfCode = Math.max(0, totalLinesOfCode)
  }
  
  // Fallback to current file calculation if time series fails
  if (totalLinesOfCode === 0 && currentFiles && currentFiles.size > 0) {
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
  }
  
  // Calculate unique contributors
  const uniqueContributors = new Set(commits.map(c => c.authorEmail)).size
  
  // Calculate active days (unique dates with commits)
  const uniqueDates = new Set(commits.map(c => c.date.split('T')[0]))
  const activeDays = uniqueDates.size
  
  progressReporter?.report('Loading image assets')
  const imagesDir = join(__dirname, '../../src/images')
  const logoSvg = await readFile(join(imagesDir, 'logo.svg'), 'utf-8')
  const trophySvgs = {
    contributors: await readFile(join(imagesDir, 'trophy-contributors.svg'), 'utf-8'),
    files: await readFile(join(imagesDir, 'trophy-files.svg'), 'utf-8'),
    bytesAdded: await readFile(join(imagesDir, 'trophy-bytes-added.svg'), 'utf-8'),
    bytesRemoved: await readFile(join(imagesDir, 'trophy-bytes-removed.svg'), 'utf-8'),
    linesAdded: await readFile(join(imagesDir, 'trophy-lines-added.svg'), 'utf-8'),
    linesRemoved: await readFile(join(imagesDir, 'trophy-lines-removed.svg'), 'utf-8'),
    averageLow: await readFile(join(imagesDir, 'trophy-average-low.svg'), 'utf-8'),
    averageHigh: await readFile(join(imagesDir, 'trophy-average-high.svg'), 'utf-8')
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

async function injectDataIntoTemplate(template: string, chartData: ReportTemplateData, pipelineData: ProcessedData, context: AnalysisContext): Promise<string> {
  const { commits, repoPath, progressReporter, config } = context
  
  progressReporter?.report('Using unified pipeline data for template injection')
  
  // All data processing is now handled by the unified pipeline
  const { contributors, fileTypes, timeSeries, linearSeries, wordCloudData, fileHeatData, topFilesData, awards } = pipelineData
  
  // Bundle the simplified charts script
  const bundledScript = await bundleCharts()
  
  // Prepare all chart data
  const allChartData = {
    commits,
    contributors,
    fileTypes,
    timeSeries,
    linearSeries,
    wordCloudData,
    fileHeatData,
    topFilesData,
    awards,
    trophySvgs: chartData.trophySvgs,
    githubUrl: await getGitHubUrl(repoPath),
    isLizardInstalled: chartData.isLizardInstalled,
    chartsConfig: config.charts,
    fileTypesConfig: config.fileTypes
  }
  
  // Main script that loads the bundled code and renders charts
  const mainScript = `
    <script>
      ${bundledScript}
      
      // Chart data
      const chartData = ${JSON.stringify(allChartData)};
      
      // Initialize when DOM is ready  
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          window.renderAllCharts(chartData);
          // Re-initialize collapse functionality after charts are rendered
          setTimeout(() => {
            if (typeof initChartCollapse === 'function') {
              initChartCollapse();
            }
          }, 500);
        });
      } else {
        window.renderAllCharts(chartData);
        // Re-initialize collapse functionality after charts are rendered
        setTimeout(() => {
          if (typeof initChartCollapse === 'function') {
            initChartCollapse();
          }
        }, 500);
      }
    </script>
  `
  
  const chartScript = mainScript
  
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
