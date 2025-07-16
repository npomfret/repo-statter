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
  getTopCommitsByLinesRemoved
} from '../stats/calculator.js'
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
    reportPath = `${outputDir}/${repoName}.html`
    statsPath = `${outputDir}/repo-stats.json`
  } else {
    outputDir = 'dist'
    reportPath = `${outputDir}/${repoName}.html`
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
  
  const githubUrl = await getGitHubUrl(repoPath)
  const githubLink = githubUrl ? ` - <a href="${githubUrl}" target="_blank" class="text-decoration-none">View on GitHub</a>` : ''
  
  const logoSvg = await readFile('src/images/logo.svg', 'utf-8')
  
  const trophySvgs = {
    contributors: await readFile('src/images/trophy-contributors.svg', 'utf-8'),
    files: await readFile('src/images/trophy-files.svg', 'utf-8'),
    bytesAdded: await readFile('src/images/trophy-bytes-added.svg', 'utf-8'),
    bytesRemoved: await readFile('src/images/trophy-bytes-removed.svg', 'utf-8'),
    linesAdded: await readFile('src/images/trophy-lines-added.svg', 'utf-8'),
    linesRemoved: await readFile('src/images/trophy-lines-removed.svg', 'utf-8')
  }
  
  return {
    repositoryName: repoName,
    totalCommits,
    totalLinesOfCode,
    totalCodeChurn,
    generationDate: new Date().toLocaleString(),
    githubLink,
    logoSvg,
    trophySvgs
  }
}

function injectDataIntoTemplate(template: string, chartData: any, commits: CommitData[]): string {
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
    mostLinesRemoved: getTopCommitsByLinesRemoved(commits)
  }
  
  const chartScript = `
    <script>
      const commits = ${JSON.stringify(commits)};
      const contributors = ${JSON.stringify(contributors)};
      const fileTypes = ${JSON.stringify(fileTypes)};
      const timeSeries = ${JSON.stringify(timeSeries)};
      const linearSeries = ${JSON.stringify(linearSeries)};
      const wordCloudData = ${JSON.stringify(wordCloudData)};
      const fileHeatData = ${JSON.stringify(fileHeatData)};
      const awards = ${JSON.stringify(awards)};
      const trophySvgs = ${JSON.stringify(chartData.trophySvgs)};
      
      // Filtering variables
      let originalCommits = commits;
      let filteredCommits = commits;
      let filteredContributors = contributors;
      let filteredFileTypes = fileTypes;
      let filteredTimeSeries = timeSeries;
      let filteredLinearSeries = linearSeries;
      let filteredWordCloudData = wordCloudData;
      let filteredFileHeatData = fileHeatData;
      
      let commitActivityChart = null;
      let linesOfCodeChart = null;
      let codeChurnChart = null;
      let repositorySizeChart = null;
      
      // Filtering functions
      function applyFilters() {
        const authorFilter = document.getElementById('authorFilter').value;
        const dateFromFilter = document.getElementById('dateFromFilter').value;
        const dateToFilter = document.getElementById('dateToFilter').value;
        const fileTypeFilter = document.getElementById('fileTypeFilter').value;
        
        filteredCommits = originalCommits.filter(commit => {
          // Author filter
          if (authorFilter && commit.authorName !== authorFilter) return false;
          
          // Date range filter
          const commitDate = new Date(commit.date);
          if (dateFromFilter && commitDate < new Date(dateFromFilter)) return false;
          if (dateToFilter && commitDate > new Date(dateToFilter)) return false;
          
          // File type filter
          if (fileTypeFilter && !commit.filesChanged.some(f => f.fileType === fileTypeFilter)) return false;
          
          return true;
        });
        
        updateFilterStatus();
        recalculateData();
        reRenderAllCharts();
      }
      
      function clearFilters() {
        document.getElementById('authorFilter').value = '';
        document.getElementById('dateFromFilter').value = '';
        document.getElementById('dateToFilter').value = '';
        document.getElementById('fileTypeFilter').value = '';
        
        filteredCommits = originalCommits;
        updateFilterStatus();
        recalculateData();
        reRenderAllCharts();
      }
      
      function updateFilterStatus() {
        const statusElement = document.getElementById('filterStatus');
        statusElement.textContent = \`Showing \${filteredCommits.length} of \${originalCommits.length} commits\`;
      }
      
      function recalculateData() {
        // Recalculate contributors
        const contributorMap = new Map();
        for (const commit of filteredCommits) {
          if (!contributorMap.has(commit.authorName)) {
            contributorMap.set(commit.authorName, { name: commit.authorName, commits: 0, linesAdded: 0, linesDeleted: 0 });
          }
          const existing = contributorMap.get(commit.authorName);
          existing.commits += 1;
          existing.linesAdded += commit.linesAdded;
          existing.linesDeleted += commit.linesDeleted;
        }
        filteredContributors = Array.from(contributorMap.values()).sort((a, b) => b.commits - a.commits);
        
        // Recalculate file types
        const fileTypeMap = new Map();
        for (const commit of filteredCommits) {
          for (const fileChange of commit.filesChanged) {
            const existing = fileTypeMap.get(fileChange.fileType) ?? 0;
            fileTypeMap.set(fileChange.fileType, existing + fileChange.linesAdded);
          }
        }
        const total = Array.from(fileTypeMap.values()).reduce((sum, lines) => sum + lines, 0);
        filteredFileTypes = Array.from(fileTypeMap.entries())
          .map(([type, lines]) => ({ type, lines, percentage: total > 0 ? (lines / total) * 100 : 0 }))
          .sort((a, b) => b.lines - a.lines);
        
        // Recalculate time series data
        const timeSeriesMap = new Map();
        let cumulativeLines = 0;
        let cumulativeBytes = 0;
        
        for (const commit of filteredCommits) {
          const dateKey = new Date(commit.date).toISOString().split('T')[0];
          if (!timeSeriesMap.has(dateKey)) {
            timeSeriesMap.set(dateKey, { date: dateKey, commits: 0, linesAdded: 0, linesDeleted: 0 });
          }
          const existing = timeSeriesMap.get(dateKey);
          existing.commits += 1;
          existing.linesAdded += commit.linesAdded;
          existing.linesDeleted += commit.linesDeleted;
          cumulativeLines += commit.linesAdded;
          cumulativeBytes += commit.estimatedBytes || (commit.linesAdded * 50);
        }
        
        filteredTimeSeries = Array.from(timeSeriesMap.values())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Add cumulative data
        let runningLines = 0;
        let runningBytes = 0;
        filteredTimeSeries.forEach(point => {
          runningLines += point.linesAdded;
          runningBytes += point.linesAdded * 50;
          point.cumulativeLines = runningLines;
          point.cumulativeBytes = runningBytes;
        });
        
        // Recalculate linear series
        filteredLinearSeries = filteredCommits.map((commit, index) => ({
          commitIndex: index + 1,
          cumulativeLines: filteredCommits.slice(0, index + 1).reduce((sum, c) => sum + c.linesAdded, 0),
          cumulativeBytes: filteredCommits.slice(0, index + 1).reduce((sum, c) => sum + (c.estimatedBytes || c.linesAdded * 50), 0)
        }));
        
        // Recalculate word cloud data
        const messages = filteredCommits.map(c => c.message);
        const words = messages.join(' ').toLowerCase()
          .replace(/[^a-z\\s]/g, ' ')
          .split(/\\s+/)
          .filter(word => word.length > 2)
          .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word));
        
        const wordFreq = new Map();
        words.forEach(word => wordFreq.set(word, (wordFreq.get(word) || 0) + 1));
        
        filteredWordCloudData = Array.from(wordFreq.entries())
          .map(([text, freq]) => ({ text, size: Math.min(freq * 10 + 12, 60) }))
          .sort((a, b) => b.size - a.size)
          .slice(0, 50);
        
        // Recalculate file heat data
        const fileMap = new Map();
        for (const commit of filteredCommits) {
          const commitDate = new Date(commit.date);
          for (const fileChange of commit.filesChanged) {
            const existing = fileMap.get(fileChange.fileName);
            if (!existing) {
              fileMap.set(fileChange.fileName, {
                commitCount: 1,
                lastModified: commitDate,
                totalLines: fileChange.linesAdded,
                fileType: fileChange.fileType
              });
            } else {
              existing.commitCount += 1;
              existing.totalLines += fileChange.linesAdded;
              if (commitDate > existing.lastModified) {
                existing.lastModified = commitDate;
              }
            }
          }
        }
        
        const now = new Date();
        filteredFileHeatData = [];
        for (const [fileName, data] of fileMap.entries()) {
          const daysSinceLastModification = (now.getTime() - data.lastModified.getTime()) / (1000 * 60 * 60 * 24);
          const frequency = data.commitCount;
          const recency = Math.exp(-daysSinceLastModification / 30);
          const heatScore = (frequency * 0.4) + (recency * 0.6);
          
          filteredFileHeatData.push({
            fileName,
            heatScore,
            commitCount: data.commitCount,
            lastModified: data.lastModified.toISOString(),
            totalLines: Math.max(data.totalLines, 1),
            fileType: data.fileType
          });
        }
        filteredFileHeatData.sort((a, b) => b.heatScore - a.heatScore);
      }
      
      function clearAllCharts() {
        document.querySelector('#commitActivityChart').innerHTML = '';
        document.querySelector('#contributorsChart').innerHTML = '';
        document.querySelector('#fileTypesChart').innerHTML = '';
        document.querySelector('#codeChurnChart').innerHTML = '';
        document.querySelector('#repositorySizeChart').innerHTML = '';
        document.querySelector('#wordCloudChart').innerHTML = '';
        document.querySelector('#fileHeatmapChart').innerHTML = '';
        
        if (commitActivityChart) {
          commitActivityChart.destroy();
          commitActivityChart = null;
        }
        if (linesOfCodeChart) {
          linesOfCodeChart.destroy();
          linesOfCodeChart = null;
        }
        if (codeChurnChart) {
          codeChurnChart.destroy();
          codeChurnChart = null;
        }
        if (repositorySizeChart) {
          repositorySizeChart.destroy();
          repositorySizeChart = null;
        }
      }
      
      function reRenderAllCharts() {
        clearAllCharts();
        
        renderCommitActivityChart();
        renderContributorsChart();
        renderLinesOfCodeChart();
        renderFileTypesChart();
        renderCodeChurnChart();
        renderRepositorySizeChart();
        renderWordCloud();
        renderFileHeatmap();
        renderAwards();
      }
      
      function populateFilters() {
        // Populate author filter
        const authors = [...new Set(originalCommits.map(c => c.authorName))].sort();
        const authorSelect = document.getElementById('authorFilter');
        authors.forEach(author => {
          const option = document.createElement('option');
          option.value = author;
          option.textContent = author;
          authorSelect.appendChild(option);
        });
        
        // Populate file type filter
        const fileTypes = [...new Set(originalCommits.flatMap(c => c.filesChanged.map(f => f.fileType)))].sort();
        const fileTypeSelect = document.getElementById('fileTypeFilter');
        fileTypes.forEach(type => {
          const option = document.createElement('option');
          option.value = type;
          option.textContent = type;
          fileTypeSelect.appendChild(option);
        });
        
        // Set default date range
        const dates = originalCommits.map(c => new Date(c.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        
        document.getElementById('dateFromFilter').value = minDate.toISOString().split('T')[0];
        document.getElementById('dateToFilter').value = maxDate.toISOString().split('T')[0];
      }
      
      function formatBytes(bytes) {
        if (bytes >= 1000000000) {
          return (bytes / 1000000000).toFixed(2) + ' GB';
        } else if (bytes >= 1000000) {
          return (bytes / 1000000).toFixed(2) + ' MB';
        } else if (bytes >= 1000) {
          return (bytes / 1000).toFixed(2) + ' KB';
        } else {
          return bytes.toFixed(0) + ' bytes';
        }
      }
      
      function createCommitTooltip(xAxis, filteredLinearSeries, commits, customContent) {
        return function({ seriesIndex, dataPointIndex, w }) {
          if (xAxis === 'commit') {
            const point = filteredLinearSeries[dataPointIndex];
            if (point && point.sha !== 'start') {
              const commit = commits.find(c => c.sha === point.sha);
              if (commit) {
                const truncateMessage = function(msg, maxLength) {
                  if (msg.length <= maxLength) return msg;
                  return msg.substring(0, maxLength) + '...';
                };
                
                let content = '<div class="custom-tooltip">' +
                  '<div class="tooltip-title">Commit #' + point.commitIndex + '</div>' +
                  '<div class="tooltip-content">' +
                  '<div><strong>SHA:</strong> ' + commit.sha.substring(0, 7) + '</div>' +
                  '<div><strong>Author:</strong> ' + commit.authorName + '</div>' +
                  '<div><strong>Date:</strong> ' + new Date(commit.date).toLocaleString() + '</div>' +
                  '<div class="tooltip-message"><strong>Message:</strong> ' + truncateMessage(commit.message, 200) + '</div>';
                
                if (customContent) {
                  content += customContent(commit, point);
                }
                
                content += '</div></div>';
                return content;
              }
            }
          }
          return null;
        };
      }
      
      function renderCommitActivityChart() {
        const xAxis = document.querySelector('input[name="commitActivityXAxis"]:checked').value;
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        
        if (commitActivityChart) {
          commitActivityChart.destroy();
        }
        document.querySelector('#commitActivityChart').innerHTML = '';

        const options = {
          chart: { 
            type: 'area', 
            height: 350, 
            toolbar: { show: false },
            background: isDark ? '#161b22' : '#ffffff'
          },
          series: [{
            name: 'Commits',
            data: xAxis === 'date'
              ? filteredTimeSeries.map(point => ({ x: point.date, y: point.commits }))
              : filteredLinearSeries.map(point => ({ x: point.commitIndex, y: point.commits }))
          }],
          xaxis: { 
            type: xAxis === 'date' ? 'datetime' : 'numeric', 
            title: { 
              text: xAxis === 'date' ? 'Date' : 'Commit Number',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            labels: { 
              style: { colors: isDark ? '#f0f6fc' : '#24292f' },
              formatter: xAxis === 'commit' ? function(val) { return Math.floor(val); } : undefined
            }
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
          tooltip: { 
            theme: isDark ? 'dark' : 'light',
            x: {
              format: xAxis === 'date' ? 'dd MMM yyyy' : undefined
            }
          }
        };
        commitActivityChart = new ApexCharts(document.querySelector('#commitActivityChart'), options);
        commitActivityChart.render();
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
          series: [{ name: 'Commits', data: filteredContributors.slice(0, 10).map(c => c.commits) }],
          xaxis: { 
            categories: filteredContributors.slice(0, 10).map(c => c.name), 
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
        const xAxis = document.querySelector('input[name="linesOfCodeXAxis"]:checked').value;
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        
        if (linesOfCodeChart) {
          linesOfCodeChart.destroy();
        }
        document.querySelector('#linesOfCodeChart').innerHTML = '';

        const options = {
          chart: { 
            type: 'area', 
            height: 350, 
            toolbar: { show: false },
            background: isDark ? '#161b22' : '#ffffff'
          },
          series: [{
            name: 'Lines of Code',
            data: xAxis === 'date'
              ? filteredTimeSeries.map(point => ({ x: new Date(point.date).getTime(), y: point.cumulativeLines }))
              : filteredLinearSeries.map(point => ({ x: point.commitIndex, y: point.cumulativeLines }))
          }],
          dataLabels: {
            enabled: false
          },
          stroke: {
            curve: 'smooth'
          },
          xaxis: { 
            type: xAxis === 'date' ? 'datetime' : 'numeric', 
            title: { 
              text: xAxis === 'date' ? 'Date' : 'Commit Number',
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
              style: { colors: isDark ? '#f0f6fc' : '#24292f' },
              formatter: xAxis === 'commit' ? function(val) { return Math.floor(val); } : undefined
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
              format: xAxis === 'date' ? 'dd MMM yyyy' : undefined
            },
            custom: createCommitTooltip(xAxis, filteredLinearSeries, commits, function(commit, point) {
              let linesDisplay = '';
              const added = commit.linesAdded;
              const deleted = commit.linesDeleted;
              const net = point.netLines;

              if (added > 0) {
                  linesDisplay += '+' + added;
              }
              if (deleted > 0) {
                  if (linesDisplay !== '') {
                      linesDisplay += ' / ';
                  }
                  linesDisplay += '-' + deleted;
              }

              let netDisplay = '';
              if (added > 0 && deleted > 0) {
                  netDisplay = ' (Net: ' + (net > 0 ? '+' : '') + net + ')';
              } else if (added === 0 && deleted === 0) {
                  linesDisplay = '0';
              }

              return '<div><strong>Lines:</strong> ' + linesDisplay + netDisplay + '</div>' +
                     '<div><strong>Total Lines:</strong> ' + point.cumulativeLines.toLocaleString() + '</div>';
            })
          }
        };
        linesOfCodeChart = new ApexCharts(document.querySelector('#linesOfCodeChart'), options);
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
          series: filteredFileTypes.slice(0, 8).map(ft => ft.lines),
          labels: filteredFileTypes.slice(0, 8).map(ft => ft.type),
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
        const xAxis = document.querySelector('input[name="codeChurnXAxis"]:checked').value;
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

        if (codeChurnChart) {
          codeChurnChart.destroy();
        }
        document.querySelector('#codeChurnChart').innerHTML = '';

        const options = {
          chart: { 
            type: 'area', 
            height: 350, 
            toolbar: { show: false }, 
            stacked: true,
            background: isDark ? '#161b22' : '#ffffff'
          },
          series: [
            { 
              name: 'Lines Added', 
              data: xAxis === 'date'
                ? filteredTimeSeries.map(point => ({ x: point.date, y: point.linesAdded }))
                : filteredLinearSeries.map(point => ({ x: point.commitIndex, y: point.linesAdded }))
            },
            { 
              name: 'Lines Deleted', 
              data: xAxis === 'date'
                ? filteredTimeSeries.map(point => ({ x: point.date, y: point.linesDeleted }))
                : filteredLinearSeries.map(point => ({ x: point.commitIndex, y: point.linesDeleted }))
            }
          ],
          xaxis: { 
            type: xAxis === 'date' ? 'datetime' : 'numeric', 
            title: { 
              text: xAxis === 'date' ? 'Date' : 'Commit Number',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            labels: { 
              style: { colors: isDark ? '#f0f6fc' : '#24292f' },
              formatter: xAxis === 'commit' ? function(val) { return Math.floor(val); } : undefined
            }
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
            theme: isDark ? 'dark' : 'light',
            x: {
              format: xAxis === 'date' ? 'dd MMM yyyy' : undefined
            },
            custom: createCommitTooltip(xAxis, filteredLinearSeries, commits, function(commit, point) {
              return '<div><strong>Lines Added:</strong> ' + commit.linesAdded.toLocaleString() + '</div>' +
                     '<div><strong>Lines Deleted:</strong> ' + commit.linesDeleted.toLocaleString() + '</div>';
            })
          }
        };
        codeChurnChart = new ApexCharts(document.querySelector('#codeChurnChart'), options);
        codeChurnChart.render();
      }
      
      function renderRepositorySizeChart() {
        const xAxis = document.querySelector('input[name="repoSizeXAxis"]:checked').value;
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

        if (repositorySizeChart) {
          repositorySizeChart.destroy();
        }
        document.querySelector('#repositorySizeChart').innerHTML = '';

        const options = {
          chart: { 
            type: 'area', 
            height: 350, 
            toolbar: { show: false },
            background: isDark ? '#161b22' : '#ffffff'
          },
          series: [{
            name: 'Repository Size',
            data: xAxis === 'date'
              ? filteredTimeSeries.map(point => ({ x: point.date, y: point.cumulativeBytes }))
              : filteredLinearSeries.map(point => ({ x: point.commitIndex, y: point.cumulativeBytes }))
          }],
          dataLabels: { enabled: false },
          stroke: { curve: 'smooth' },
          xaxis: { 
            type: xAxis === 'date' ? 'datetime' : 'numeric', 
            title: { 
              text: xAxis === 'date' ? 'Date' : 'Commit Number',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            labels: {
              datetimeFormatter: {
                year: 'yyyy',
                month: 'MMM yyyy',
                day: 'dd MMM',
                hour: 'HH:mm'
              },
              style: { colors: isDark ? '#f0f6fc' : '#24292f' },
              formatter: xAxis === 'commit' ? function(val) { return Math.floor(val); } : undefined
            }
          },
          yaxis: { 
            title: { 
              text: 'Repository Size',
              style: { color: isDark ? '#f0f6fc' : '#24292f' }
            },
            min: 0,
            labels: {
              formatter: formatBytes,
              style: { colors: isDark ? '#f0f6fc' : '#24292f' }
            }
          },
          fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.9 } },
          colors: [isDark ? '#a5a5ff' : '#b33dc6'],
          grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
          tooltip: {
            theme: isDark ? 'dark' : 'light',
            x: {
              format: xAxis === 'date' ? 'dd MMM yyyy' : undefined
            },
            y: {
              formatter: formatBytes
            },
            custom: createCommitTooltip(xAxis, filteredLinearSeries, commits, function(commit, point) {
              return '<div><strong>Bytes Added:</strong> ' + formatBytes(commit.bytesAdded || 0) + '</div>' +
                     '<div><strong>Bytes Deleted:</strong> ' + formatBytes(commit.bytesDeleted || 0) + '</div>' +
                     '<div><strong>Total Size:</strong> ' + formatBytes(point.cumulativeBytes) + '</div>';
            })
          }
        };
        repositorySizeChart = new ApexCharts(document.querySelector('#repositorySizeChart'), options);
        repositorySizeChart.render();
      }
      
      function renderWordCloud() {
        if (filteredWordCloudData.length === 0) {
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
          .words(filteredWordCloudData.map(function(d) {
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
        if (filteredFileHeatData.length === 0) {
          document.querySelector('#fileHeatmapChart').innerHTML = '<p class="text-muted text-center">No file data to analyze</p>';
          return;
        }
        
        const container = document.querySelector('#fileHeatmapChart');
        const width = container.offsetWidth;
        const height = 400;
        
        // Theme-aware colors
        const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        
        // Create color scale for heat values
        const maxHeat = Math.max(...filteredFileHeatData.map(d => d.heatScore));
        const minHeat = Math.min(...filteredFileHeatData.map(d => d.heatScore));
        
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
        const nodes = treemap.nodes({children: filteredFileHeatData});
        
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
      
      function renderAwards() {
        const container = document.getElementById('awardsContainer');
        container.innerHTML = '';
        
        const awardCategories = [
          { title: 'Top Contributors', data: awards.topContributors, formatValue: (v) => v.commits + ' commits', showAuthor: false, trophy: trophySvgs.contributors },
          { title: 'Most Files Modified', data: awards.mostFilesModified, formatValue: (v) => v + ' files', trophy: trophySvgs.files },
          { title: 'Most Bytes Added', data: awards.mostBytesAdded, formatValue: formatBytes, trophy: trophySvgs.bytesAdded },
          { title: 'Most Bytes Removed', data: awards.mostBytesRemoved, formatValue: formatBytes, trophy: trophySvgs.bytesRemoved },
          { title: 'Most Lines Added', data: awards.mostLinesAdded, formatValue: (v) => v.toLocaleString() + ' lines', trophy: trophySvgs.linesAdded },
          { title: 'Most Lines Removed', data: awards.mostLinesRemoved, formatValue: (v) => v.toLocaleString() + ' lines', trophy: trophySvgs.linesRemoved }
        ];
        
        awardCategories.forEach(category => {
          const col = document.createElement('div');
          col.className = 'col-md-4 mb-4';
          
          const card = document.createElement('div');
          card.className = 'card h-100';
          card.style.position = 'relative';
          
          // Add trophy in top-right corner of the card
          const trophyWrapper = document.createElement('div');
          trophyWrapper.style.cssText = 'position: absolute; top: 10px; right: 10px; width: 80px; height: 80px; z-index: 10;';
          trophyWrapper.innerHTML = category.trophy;
          
          // Ensure SVG fits properly within the wrapper
          const svgElement = trophyWrapper.querySelector('svg');
          if (svgElement) {
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';
            svgElement.style.display = 'block';
          }
          
          card.appendChild(trophyWrapper);
          
          const cardHeader = document.createElement('div');
          cardHeader.className = 'card-header';
          
          const titleElement = document.createElement('h6');
          titleElement.className = 'mb-0';
          titleElement.textContent = category.title;
          cardHeader.appendChild(titleElement);
          
          const cardBody = document.createElement('div');
          cardBody.className = 'card-body';
          
          const list = document.createElement('ol');
          list.className = 'mb-0';
          
          if (category.title === 'Top Contributors') {
            category.data.forEach((contributor, index) => {
              const item = document.createElement('li');
              item.innerHTML = '<strong>' + contributor.name + '</strong>: ' + category.formatValue(contributor);
              list.appendChild(item);
            });
          } else {
            category.data.forEach((commit, index) => {
              const item = document.createElement('li');
              const truncatedMessage = commit.message.length > 50 ? commit.message.substring(0, 50) + '...' : commit.message;
              item.innerHTML = 
                '<div>' +
                '<strong>' + truncatedMessage + '</strong><br>' +
                '<small class="text-muted">' + commit.authorName + ' - ' + new Date(commit.date).toLocaleDateString() + '</small><br>' +
                '<small class="text-muted">SHA: ' + commit.sha.substring(0, 7) + ' - ' + category.formatValue(commit.value) + '</small>' +
                '</div>';
              list.appendChild(item);
            });
          }
          
          cardBody.appendChild(list);
          card.appendChild(cardHeader);
          card.appendChild(cardBody);
          col.appendChild(card);
          container.appendChild(col);
        });
      }
      
      document.addEventListener('DOMContentLoaded', function() {
        // Initialize filters
        populateFilters();
        
        renderCommitActivityChart();
        renderContributorsChart();
        renderLinesOfCodeChart();
        renderFileTypesChart();
        renderCodeChurnChart();
        renderRepositorySizeChart();
        renderWordCloud();
        renderFileHeatmap();
        renderAwards();
        
        // Add event listeners for filters
        document.getElementById('applyFilters').addEventListener('click', applyFilters);
        document.getElementById('clearFilters').addEventListener('click', clearFilters);
        
        // Add event listeners for axis toggles
        document.querySelectorAll('input[name="commitActivityXAxis"]').forEach(input => {
          input.addEventListener('change', renderCommitActivityChart);
        });
        document.querySelectorAll('input[name="linesOfCodeXAxis"]').forEach(input => {
          input.addEventListener('change', renderLinesOfCodeChart);
        });
        document.querySelectorAll('input[name="codeChurnXAxis"]').forEach(input => {
          input.addEventListener('change', renderCodeChurnChart);
        });
        document.querySelectorAll('input[name="repoSizeXAxis"]').forEach(input => {
          input.addEventListener('change', renderRepositorySizeChart);
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
    .replace(/{{githubLink}}/g, chartData.githubLink)
    .replace(/{{logoSvg}}/g, chartData.logoSvg)
    .replace('</body>', chartScript + '\n</body>')
}