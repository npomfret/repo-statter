import { basename } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { parseCommitHistory, getGitHubUrl } from '../git/parser.js'
import { getContributorStats, getFileTypeStats } from '../stats/calculator.js'
import { getTimeSeriesData, getLinearSeriesData } from '../chart/data-transformer.js'
import type { CommitData } from '../git/parser.js'

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

function injectDataIntoTemplate(template: string, chartData: any, commits: CommitData[]): string {
  const contributors = getContributorStats(commits)
  const fileTypes = getFileTypeStats(commits)
  const timeSeries = getTimeSeriesData(commits)
  const linearSeries = getLinearSeriesData(commits)
  
  const chartScript = `
    <script>
      const commits = ${JSON.stringify(commits)};
      const contributors = ${JSON.stringify(contributors)};
      const fileTypes = ${JSON.stringify(fileTypes)};
      const timeSeries = ${JSON.stringify(timeSeries)};
      const linearSeries = ${JSON.stringify(linearSeries)};
      
      
      let linesOfCodeChart = null;
      
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
          series: [{ name: 'Lines of Code', data: timeSeries.map(point => ({ x: new Date(point.date).getTime(), y: point.cumulativeLines })) }],
          dataLabels: {
            enabled: false
          },
          stroke: {
            curve: 'smooth'
          },
          xaxis: { 
            type: 'datetime', 
            title: { text: 'Date' },
            labels: {
              datetimeFormatter: {
                year: 'yyyy',
                month: 'MMM yyyy',
                day: 'dd MMM',
                hour: 'HH:mm',
                minute: 'HH:mm',
                second: 'HH:mm:ss'
              },
              datetimeUTC: false
            }
          },
          yaxis: { 
            title: { text: 'Lines of Code' },
            min: 0
          },
          fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
          colors: ['#dc3545'],
          tooltip: {
            x: {
              format: 'dd MMM yyyy'
            }
          }
        };
        linesOfCodeChart = new ApexCharts(document.querySelector('#linesOfCodeChart'), options);
        linesOfCodeChart.render();
      }
      
      function updateLinesOfCodeChart() {
        const xAxis = document.querySelector('input[name="xAxis"]:checked').value;
        
        // Since switching between datetime and numeric axis types can cause issues,
        // we need to destroy and recreate the chart
        if (linesOfCodeChart) {
          linesOfCodeChart.destroy();
        }
        
        // Clear the container
        document.querySelector('#linesOfCodeChart').innerHTML = '';
        
        let chartOptions;
        
        if (xAxis === 'date') {
          chartOptions = {
            series: [{ 
              name: 'Lines of Code', 
              data: timeSeries.map(point => ({ x: new Date(point.date).getTime(), y: point.cumulativeLines })) 
            }],
            chart: { 
              type: 'area', 
              height: 350,
              toolbar: { show: false }
            },
            dataLabels: {
              enabled: false
            },
            stroke: {
              curve: 'smooth'
            },
            xaxis: { 
              type: 'datetime',
              title: { text: 'Date' },
              labels: {
                datetimeFormatter: {
                  year: 'yyyy',
                  month: 'MMM yyyy',
                  day: 'dd MMM',
                  hour: 'HH:mm',
                  minute: 'HH:mm',
                  second: 'HH:mm:ss'
                },
                datetimeUTC: false
              }
            },
            yaxis: {
              title: { text: 'Lines of Code' },
              min: 0
            },
            fill: { 
              type: 'gradient', 
              gradient: { 
                shadeIntensity: 1, 
                opacityFrom: 0.7, 
                opacityTo: 0.9 
              } 
            },
            colors: ['#dc3545'],
            tooltip: {
              x: {
                format: 'dd MMM yyyy'
              }
            }
          };
        } else {
          // By Commit view
          chartOptions = {
            series: [{ 
              name: 'Lines of Code', 
              data: linearSeries.map(point => ({ x: point.commitIndex, y: point.cumulativeLines })) 
            }],
            chart: { 
              type: 'area', 
              height: 350,
              toolbar: { show: false }
            },
            dataLabels: {
              enabled: false
            },
            stroke: {
              curve: 'smooth'
            },
            xaxis: {
              type: 'numeric',
              title: { text: 'Commit Number' },
              labels: {
                formatter: function(val) {
                  return Math.floor(val);
                }
              }
            },
            yaxis: {
              title: { text: 'Lines of Code' },
              min: 0
            },
            fill: { 
              type: 'gradient', 
              gradient: { 
                shadeIntensity: 1, 
                opacityFrom: 0.7, 
                opacityTo: 0.9 
              } 
            },
            colors: ['#dc3545']
          };
        }
        
        linesOfCodeChart = new ApexCharts(document.querySelector('#linesOfCodeChart'), chartOptions);
        linesOfCodeChart.render();
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
        
        // Add event listeners for axis toggles
        document.querySelectorAll('input[name="xAxis"]').forEach(input => {
          input.addEventListener('change', updateLinesOfCodeChart);
        });
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