import { basename } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { parseCommitHistory, getGitHubUrl } from '../git/parser.js'
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
  getHighestAverageLinesChanged
} from '../stats/calculator.js'
import { getTimeSeriesData, getLinearSeriesData } from '../chart/data-transformer.js'
import { processCommitMessages } from '../text/processor.js'
import type { CommitData } from '../git/parser.js'
import type { ChartData } from '../types/index.js'
import { TemplateEngine } from './template-engine.js'
import { ScriptBuilder } from './script-builder.js'

export async function generateReport(repoPath: string, outputMode: 'dist' | 'analysis' = 'dist'): Promise<void> {
  try {
    // Parse commits
    const commits = await parseCommitHistory(repoPath)
    if (commits.length === 0) {
      throw new Error('No commits found in repository')
    }
    
    const repoName = repoPath === '.' ? basename(process.cwd()) : basename(repoPath) || 'repo'
    
    // Determine output paths
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
    
    // Create output directory
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true })
    }
    
    // Load template
    const templatePath = 'src/report/template.html'
    if (!existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`)
    }
    const template = await readFile(templatePath, 'utf-8')
    
    // Validate template
    const templateErrors = TemplateEngine.validateTemplate(template)
    if (templateErrors.length > 0) {
      throw new Error(`Template validation failed: ${templateErrors.join(', ')}`)
    }
    
    // Transform data
    const chartData = await transformCommitData(commits, repoName, repoPath)
    
    // Generate HTML
    const html = await injectDataIntoTemplate(template, chartData, commits)
    
    // Write output
    await writeFile(reportPath, html)
    
    // Write stats if requested
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
    
    // Log success
    console.log(`Report generated: ${reportPath}`)
    if (statsPath) {
      console.log(`Stats saved: ${statsPath}`)
    }
    console.log(`Repository: ${repoName}`)
    console.log(`Total commits: ${commits.length}`)
    console.log(`Total lines added: ${commits.reduce((sum, c) => sum + c.linesAdded, 0)}`)
  } catch (error) {
    console.error('Failed to generate report:', error)
    throw error
  }
}

async function transformCommitData(commits: CommitData[], repoName: string, repoPath: string): Promise<ChartData> {
  try {
    const totalCommits = commits.length
    const totalLinesOfCode = commits.reduce((sum, commit) => sum + commit.linesAdded, 0)
    const totalCodeChurn = commits.reduce((sum, commit) => sum + commit.linesAdded + commit.linesDeleted, 0)
    
    const githubUrl = await getGitHubUrl(repoPath)
    const githubLink = githubUrl ? ` - <a href="${githubUrl}" target="_blank" class="text-decoration-none">View on GitHub</a>` : ''
    
    // Load SVG assets
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
    
    const latestCommit = commits[0] // Assuming commits are sorted by date, latest first
    
    return {
      repositoryName: repoName,
      totalCommits,
      totalLinesOfCode,
      totalCodeChurn,
      generationDate: new Date().toLocaleString(),
      githubLink,
      logoSvg,
      trophySvgs,
      latestCommitHash: latestCommit ? latestCommit.sha.substring(0, 7) : 'N/A',
      latestCommitAuthor: latestCommit ? latestCommit.authorName : 'N/A',
      latestCommitDate: latestCommit ? new Date(latestCommit.date).toLocaleString() : 'N/A'
    }
  } catch (error) {
    console.error('Failed to transform commit data:', error)
    throw error
  }
}

async function injectDataIntoTemplate(template: string, chartData: ChartData, commits: CommitData[]): Promise<string> {
  try {
    // Prepare all data
    const contributors = getContributorStats(commits)
    const fileTypes = getFileTypeStats(commits)
    const timeSeries = getTimeSeriesData(commits)
    const linearSeries = getLinearSeriesData(commits)
    const wordCloudData = processCommitMessages(commits.map(c => c.message))
    const fileHeatData = getFileHeatData(commits)
    
    const awards = {
      topContributors: contributors.slice(0, 5),
      mostFilesModified: getTopCommitsByFilesModified(commits),
      mostBytesAdded: getTopCommitsByBytesAdded(commits),
      mostBytesRemoved: getTopCommitsByBytesRemoved(commits),
      mostLinesAdded: getTopCommitsByLinesAdded(commits),
      mostLinesRemoved: getTopCommitsByLinesRemoved(commits),
      lowestAverageLinesChanged: getLowestAverageLinesChanged(commits),
      highestAverageLinesChanged: getHighestAverageLinesChanged(commits)
    }
    
    // Build script data
    const scriptData = {
      commits,
      contributors,
      fileTypes,
      timeSeries,
      linearSeries,
      wordCloudData,
      fileHeatData,
      awards,
      trophySvgs: chartData.trophySvgs
    }
    
    // Validate script data
    const scriptErrors = ScriptBuilder.validateData(scriptData)
    if (scriptErrors.length > 0) {
      throw new Error(`Script data validation failed: ${scriptErrors.join(', ')}`)
    }
    
    // Build the script
    const scriptContent = ScriptBuilder.buildScript(scriptData)
    
    // Note: For now, we'll still use the existing inline script from generator.ts
    // This is just to demonstrate the refactored structure
    // In a full implementation, we would build a proper client bundle
    
    // Use template engine to render
    const templateEngine = new TemplateEngine(template)
    return templateEngine.render(chartData, scriptContent)
  } catch (error) {
    console.error('Failed to inject data into template:', error)
    throw error
  }
}