import { basename } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { parseCommitHistory, getGitHubUrl } from '../git/parser.js'
import { getContributorStats, getFileTypeStats, getFileHeatData } from '../stats/calculator.js'
import { getTimeSeriesData, getLinearSeriesData } from '../chart/data-transformer.js'
import { processCommitMessages } from '../text/processor.js'
import type { CommitData } from '../git/parser.js'

export async function generateReport(repoPath: string, outputMode: 'dist' | 'analysis' = 'dist'): Promise<void> {
  const commits = await parseCommitHistory(repoPath)
  const repoName = repoPath === '.' ? basename(process.cwd()) : basename(repoPath) || 'repo'
  
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
  const githubLink = githubUrl ? ` - <a href="${githubUrl}" target="_blank" class="text-decoration-none">View on GitHub</a>` : ''
  
  const logoSvg = await readFile('src/images/logo.svg', 'utf-8')
  
  return {
    repositoryName: repoName,
    totalCommits,
    totalLinesOfCode,
    totalCodeChurn,
    topContributor,
    generationDate: new Date().toLocaleString(),
    githubLink,
    logoSvg
  }
}

function injectDataIntoTemplate(template: string, chartData: any, commits: CommitData[]): string {
  const contributors = getContributorStats(commits)
  const fileTypes = getFileTypeStats(commits)
  const timeSeries = getTimeSeriesData(commits)
  const linearSeries = getLinearSeriesData(commits)
  const wordCloudData = processCommitMessages(commits.map(c => c.message))
  const fileHeatData = getFileHeatData(commits)
  
  const chartScript = `
    <script>
      const commits = ${JSON.stringify(commits)};
      const contributors = ${JSON.stringify(contributors)};
      const fileTypes = ${JSON.stringify(fileTypes)};
      const timeSeries = ${JSON.stringify(timeSeries)};
      const linearSeries = ${JSON.stringify(linearSeries)};
      const wordCloudData = ${JSON.stringify(wordCloudData)};
      const fileHeatData = ${JSON.stringify(fileHeatData)};
      
      
      let linesOfCodeChart = null;
      
      function renderCommitActivityChart() {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const options = {
          chart: { 
            type: 'area', 
            height: 350, 
            toolbar: { show: false },
            background: isDark ? '#161b22' : '#ffffff'
          },
          series: [{ name: 'Commits', data: timeSeries.map(point => ({ x: point.date, y: point.commits })) }],
          xaxis: { 
            type: 'datetime', 
            title: { 
              text: 'Date',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
          },
          yaxis: { 
            title: { 
              text: 'Commits',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
          },
          fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
          colors: [isDark ? '#58a6ff' : '#27aeef'],
          grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
          tooltip: { theme: isDark ? 'dark' : 'light' }
        };
        new ApexCharts(document.querySelector('#commitActivityChart'), options).render();
      }
      
      function renderContributorsChart() {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const options = {
          chart: { 
            type: 'bar', 
            height: 350, 
            toolbar: { show: false },
            background: isDark ? '#161b22' : '#ffffff'
          },
          series: [{ name: 'Commits', data: contributors.slice(0, 10).map(c => c.commits) }],
          xaxis: { 
            categories: contributors.slice(0, 10).map(c => c.name), 
            title: { 
              text: 'Contributors',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
          },
          yaxis: { 
            title: { 
              text: 'Commits',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
          },
          colors: [isDark ? '#3fb950' : '#87bc45'],
          grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
          tooltip: { theme: isDark ? 'dark' : 'light' }
        };
        new ApexCharts(document.querySelector('#contributorsChart'), options).render();
      }
      
      function renderLinesOfCodeChart() {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const options = {
          chart: { 
            type: 'area', 
            height: 350, 
            toolbar: { show: false },
            background: isDark ? '#161b22' : '#ffffff'
          },
          series: [{ name: 'Lines of Code', data: timeSeries.map(point => ({ x: new Date(point.date).getTime(), y: point.cumulativeLines })) }],
          dataLabels: {
            enabled: false
          },
          stroke: {
            curve: 'smooth'
          },
          xaxis: { 
            type: 'datetime', 
            title: { 
              text: 'Date',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            labels: {
              datetimeFormatter: {
                year: 'yyyy',
                month: 'MMM yyyy',
                day: 'dd MMM',
                hour: 'HH:mm',
                minute: 'HH:mm',
                second: 'HH:mm:ss'
              },
              datetimeUTC: false,
              style: { colors: isDark ? '#f0f6fc' : '#24292f' }
            }
          },
          yaxis: { 
            title: { 
              text: 'Lines of Code',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            min: 0,
            labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
          },
          fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
          colors: [isDark ? '#f85149' : '#ea5545'],
          grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
          tooltip: {
            theme: isDark ? 'dark' : 'light',
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
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        
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
              toolbar: { show: false },
              background: isDark ? '#161b22' : '#ffffff'
            },
            dataLabels: {
              enabled: false
            },
            stroke: {
              curve: 'smooth'
            },
            xaxis: { 
              type: 'datetime',
              title: { 
                text: 'Date',
                style: { color: isDark ? '#f0f6fc' : '#24292f' }
              },
              labels: {
                datetimeFormatter: {
                  year: 'yyyy',
                  month: 'MMM yyyy',
                  day: 'dd MMM',
                  hour: 'HH:mm',
                  minute: 'HH:mm',
                  second: 'HH:mm:ss'
                },
                datetimeUTC: false,
                style: { colors: isDark ? '#f0f6fc' : '#24292f' }
              }
            },
            yaxis: {
              title: { 
                text: 'Lines of Code',
                style: { color: isDark ? '#f0f6fc' : '#24292f' }
              },
              min: 0,
              labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
            },
            fill: { 
              type: 'gradient', 
              gradient: { 
                shadeIntensity: 1, 
                opacityFrom: 0.7, 
                opacityTo: 0.9 
              } 
            },
            colors: [isDark ? '#f85149' : '#ea5545'],
            grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
            tooltip: {
              theme: isDark ? 'dark' : 'light',
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
              toolbar: { show: false },
              background: isDark ? '#161b22' : '#ffffff'
            },
            dataLabels: {
              enabled: false
            },
            stroke: {
              curve: 'smooth'
            },
            xaxis: {
              type: 'numeric',
              title: { 
                text: 'Commit Number',
                style: { color: isDark ? '#f0f6fc' : '#24292f' }
              },
              labels: {
                formatter: function(val) {
                  return Math.floor(val);
                },
                style: { colors: isDark ? '#f0f6fc' : '#24292f' }
              }
            },
            yaxis: {
              title: { 
                text: 'Lines of Code',
                style: { color: isDark ? '#f0f6fc' : '#24292f' }
              },
              min: 0,
              labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
            },
            fill: { 
              type: 'gradient', 
              gradient: { 
                shadeIntensity: 1, 
                opacityFrom: 0.7, 
                opacityTo: 0.9 
              } 
            },
            colors: [isDark ? '#f85149' : '#ea5545'],
            grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
            tooltip: { theme: isDark ? 'dark' : 'light' }
          };
        }
        
        linesOfCodeChart = new ApexCharts(document.querySelector('#linesOfCodeChart'), chartOptions);
        linesOfCodeChart.render();
      }
      
      function renderFileTypesChart() {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const options = {
          chart: { 
            type: 'donut', 
            height: 350,
            background: isDark ? '#161b22' : '#ffffff'
          },
          series: fileTypes.slice(0, 8).map(ft => ft.lines),
          labels: fileTypes.slice(0, 8).map(ft => ft.type),
          colors: isDark ? 
            ['#58a6ff', '#3fb950', '#f85149', '#d29922', '#a5a5ff', '#56d4dd', '#db6d28', '#8b949e'] :
            ['#27aeef', '#87bc45', '#ea5545', '#ef9b20', '#b33dc6', '#f46a9b', '#ede15b', '#bdcf32'],
          legend: {
            labels: { colors: isDark ? '#f0f6fc' : '#24292f' }
          },
          tooltip: { theme: isDark ? 'dark' : 'light' }
        };
        new ApexCharts(document.querySelector('#fileTypesChart'), options).render();
      }
      
      function renderCodeChurnChart() {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const options = {
          chart: { 
            type: 'area', 
            height: 350, 
            toolbar: { show: false }, 
            stacked: true,
            background: isDark ? '#161b22' : '#ffffff'
          },
          series: [
            { name: 'Lines Added', data: timeSeries.map(point => ({ x: point.date, y: point.linesAdded })) },
            { name: 'Lines Deleted', data: timeSeries.map(point => ({ x: point.date, y: point.linesDeleted })) }
          ],
          xaxis: { 
            type: 'datetime', 
            title: { 
              text: 'Date',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
          },
          yaxis: { 
            title: { 
              text: 'Lines Changed',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
          },
          fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
          colors: isDark ? ['#3fb950', '#f85149'] : ['#87bc45', '#ea5545'],
          grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
          legend: {
            labels: { colors: isDark ? '#f0f6fc' : '#24292f' }
          },
          tooltip: { 
            shared: true,
            theme: isDark ? 'dark' : 'light'
          }
        };
        new ApexCharts(document.querySelector('#codeChurnChart'), options).render();
      }
      
      function renderRepositorySizeChart() {
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const options = {
          chart: { 
            type: 'area', 
            height: 350, 
            toolbar: { show: false },
            background: isDark ? '#161b22' : '#ffffff'
          },
          series: [{ name: 'Repository Size', data: timeSeries.map(point => ({ x: point.date, y: point.cumulativeBytes })) }],
          dataLabels: { enabled: false },
          stroke: { curve: 'smooth' },
          xaxis: { 
            type: 'datetime', 
            title: { 
              text: 'Date',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            labels: {
              datetimeFormatter: {
                year: 'yyyy',
                month: 'MMM yyyy',
                day: 'dd MMM',
                hour: 'HH:mm'
              },
              style: { colors: isDark ? '#f0f6fc' : '#24292f' }
            }
          },
          yaxis: { 
            title: { 
              text: 'Repository Size',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            min: 0,
            labels: {
              formatter: function (val) {
                if (val >= 1000000000) {
                  return (val / 1000000000).toFixed(1) + 'GB';
                } else if (val >= 1000000) {
                  return (val / 1000000).toFixed(1) + 'MB';
                } else if (val >= 1000) {
                  return (val / 1000).toFixed(1) + 'KB';
                } else {
                  return val.toFixed(0) + 'B';
                }
              },
              style: { colors: isDark ? '#f0f6fc' : '#24292f' }
            }
          },
          fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
          colors: [isDark ? '#a5a5ff' : '#b33dc6'],
          grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
          tooltip: {
            theme: isDark ? 'dark' : 'light',
            y: {
              formatter: function (val) {
                if (val >= 1000000000) {
                  return (val / 1000000000).toFixed(2) + ' GB';
                } else if (val >= 1000000) {
                  return (val / 1000000).toFixed(2) + ' MB';
                } else if (val >= 1000) {
                  return (val / 1000).toFixed(2) + ' KB';
                } else {
                  return val.toFixed(0) + ' bytes';
                }
              }
            }
          }
        };
        new ApexCharts(document.querySelector('#repositorySizeChart'), options).render();
      }
      
      function renderWordCloud() {
        if (wordCloudData.length === 0) {
          document.querySelector('#wordCloudChart').innerHTML = '<p class="text-muted text-center">No commit messages to analyze</p>';
          return;
        }
        
        const container = document.querySelector('#wordCloudChart');
        const width = container.offsetWidth;
        const height = 400;
        
        // Theme-aware colors
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        const colors = isDark ? 
          ['#58a6ff', '#3fb950', '#f85149', '#d29922', '#a5a5ff', '#56d4dd', '#db6d28', '#8b949e'] :
          ['#27aeef', '#87bc45', '#ea5545', '#ef9b20', '#b33dc6', '#f46a9b', '#ede15b', '#bdcf32'];
        const color = d3.scale.ordinal().range(colors);
        
        const draw = function(words) {
          d3.select('#wordCloudChart')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(' + width/2 + ',' + height/2 + ')')
            .selectAll('text')
            .data(words)
            .enter().append('text')
            .style('font-size', function(d) { return d.size + 'px'; })
            .style('font-family', "'Inter', -apple-system, sans-serif")
            .style('font-weight', function(d) { return d.size > 40 ? '600' : '400'; })
            .style('fill', function(d, i) { return color(i); })
            .attr('text-anchor', 'middle')
            .attr('transform', function(d) {
              return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
            })
            .text(function(d) { return d.text; })
            .style('cursor', 'default')
            .append('title')
            .text(function(d) { return d.text + ': ' + Math.round(d.size); });
        };
        
        const layout = d3.layout.cloud()
          .size([width, height])
          .words(wordCloudData.map(function(d) {
            return {text: d.text, size: d.size};
          }))
          .padding(5)
          .rotate(function() { return ~~(Math.random() * 2) * 90; })
          .font("'Inter', -apple-system, sans-serif")
          .fontSize(function(d) { return d.size; })
          .on('end', draw);
        
        layout.start();
      }
      
      function renderFileHeatmap() {
        if (fileHeatData.length === 0) {
          document.querySelector('#fileHeatmapChart').innerHTML = '<p class="text-muted text-center">No file data to analyze</p>';
          return;
        }
        
        const container = document.querySelector('#fileHeatmapChart');
        const width = container.offsetWidth;
        const height = 400;
        
        // Theme-aware colors
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        
        // Create color scale for heat values
        const maxHeat = Math.max(...fileHeatData.map(d => d.heatScore));
        const minHeat = Math.min(...fileHeatData.map(d => d.heatScore));
        
        const colorScale = d3.scale.linear()
          .domain([minHeat, maxHeat])
          .range(isDark ? ['#0d1117', '#f85149'] : ['#f0f6fc', '#ea5545']);
        
        // Create treemap layout
        const treemap = d3.layout.treemap()
          .size([width, height])
          .value(function(d) { return d.totalLines; })
          .round(true);
        
        // Clear previous content
        d3.select('#fileHeatmapChart').selectAll('*').remove();
        
        // Create SVG
        const svg = d3.select('#fileHeatmapChart')
          .append('svg')
          .attr('width', width)
          .attr('height', height)
          .style('background', isDark ? '#161b22' : '#ffffff');
        
        // Create treemap nodes
        const nodes = treemap.nodes({children: fileHeatData});
        
        // Create rectangles for each file
        const cell = svg.selectAll('g')
          .data(nodes.filter(function(d) { return !d.children; }))
          .enter().append('g')
          .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
        
        cell.append('rect')
          .attr('width', function(d) { return d.dx; })
          .attr('height', function(d) { return d.dy; })
          .style('fill', function(d) { return colorScale(d.heatScore); })
          .style('stroke', isDark ? '#30363d' : '#e1e4e8')
          .style('stroke-width', '1px')
          .style('cursor', 'pointer');
        
        // Add file names (only if rectangle is large enough)
        cell.append('text')
          .attr('x', function(d) { return d.dx / 2; })
          .attr('y', function(d) { return d.dy / 2; })
          .attr('dy', '.35em')
          .attr('text-anchor', 'middle')
          .style('font-size', function(d) { 
            const fontSize = Math.min(d.dx / 8, d.dy / 2, 12);
            return fontSize > 8 ? fontSize + 'px' : '0px';
          })
          .style('fill', isDark ? '#f0f6fc' : '#24292f')
          .style('font-family', "'Inter', -apple-system, sans-serif")
          .style('font-weight', '500')
          .style('pointer-events', 'none')
          .text(function(d) { 
            const fileName = d.fileName.split('/').pop();
            return d.dx > 40 && d.dy > 20 ? fileName : '';
          });
        
        // Add tooltips
        cell.append('title')
          .text(function(d) { 
            return d.fileName + '\\n' +
                   'Heat Score: ' + d.heatScore.toFixed(2) + '\\n' +
                   'Commits: ' + d.commitCount + '\\n' +
                   'Lines: ' + d.totalLines + '\\n' +
                   'Type: ' + d.fileType + '\\n' +
                   'Last Modified: ' + new Date(d.lastModified).toLocaleDateString();
          });
      }
      
      document.addEventListener('DOMContentLoaded', function() {
        renderCommitActivityChart();
        renderContributorsChart();
        renderLinesOfCodeChart();
        renderFileTypesChart();
        renderCodeChurnChart();
        renderRepositorySizeChart();
        renderWordCloud();
        renderFileHeatmap();
        
        // Add event listeners for axis toggles
        document.querySelectorAll('input[name="xAxis"]').forEach(input => {
          input.addEventListener('change', updateLinesOfCodeChart);
        });
        
        // Add event listener for theme toggle
        document.getElementById('themeToggle').addEventListener('change', function(e) {
          if (e.target.checked) {
            document.documentElement.setAttribute('data-bs-theme', 'dark');
          } else {
            document.documentElement.removeAttribute('data-bs-theme');
          }
          
          // Re-render all charts to apply dark mode styling
          // Use requestAnimationFrame to ensure the theme attribute change has been
          // processed by the browser before we read it in the chart rendering functions.
          requestAnimationFrame(() => {
            // Clear all chart containers before re-rendering to avoid duplicates
            // and issues with old chart instances.
            document.querySelector('#commitActivityChart').innerHTML = '';
            document.querySelector('#contributorsChart').innerHTML = '';
            document.querySelector('#fileTypesChart').innerHTML = '';
            document.querySelector('#codeChurnChart').innerHTML = '';
            document.querySelector('#repositorySizeChart').innerHTML = '';
            document.querySelector('#wordCloudChart').innerHTML = '';
            document.querySelector('#fileHeatmapChart').innerHTML = '';
            
            // For the lines of code chart, we must destroy the existing instance
            // before re-rendering.
            if (linesOfCodeChart) {
              linesOfCodeChart.destroy();
            }

            renderCommitActivityChart();
            renderContributorsChart();
            renderLinesOfCodeChart();
            renderFileTypesChart();
            renderCodeChurnChart();
            renderRepositorySizeChart();
            renderWordCloud();
            renderFileHeatmap();
          });
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
    .replace(/{{logoSvg}}/g, chartData.logoSvg)
    .replace('</body>', chartScript + '\n</body>')
}