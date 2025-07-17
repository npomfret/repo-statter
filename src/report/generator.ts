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
  totalCodeChurn: number
  generationDate: string
  githubLink: string
  logoSvg: string
  trophySvgs: TrophySvgs
  latestCommitHash: string
  latestCommitAuthor: string
  latestCommitDate: string
}

async function transformCommitData(commits: CommitData[], repoName: string, repoPath: string): Promise<ChartData> {
  const totalCommits = commits.length
  const totalLinesOfCode = commits.reduce((sum, commit) => sum + commit.linesAdded, 0)
  const totalCodeChurn = commits.reduce((sum, commit) => sum + commit.linesAdded + commit.linesDeleted, 0)
  
  const githubUrl = await getGitHubUrl(repoPath)
  const githubLink = githubUrl ? ` - <a href="${githubUrl}" target="_blank" class="text-decoration-none">View on GitHub</a>` : ''
  
  const logoSvg = await readFile('src/images/logo.svg', 'utf-8')
  
  const trophySvgs: TrophySvgs = {
    contributors: await readFile('src/images/trophy-contributors.svg', 'utf-8'),
    files: await readFile('src/images/trophy-files.svg', 'utf-8'),
    bytesAdded: await readFile('src/images/trophy-bytes-added.svg', 'utf-8'),
    bytesRemoved: await readFile('src/images/trophy-bytes-removed.svg', 'utf-8'),
    linesAdded: await readFile('src/images/trophy-lines-added.svg', 'utf-8'),
    linesRemoved: await readFile('src/images/trophy-lines-removed.svg', 'utf-8'),
    averageLow: await readFile('src/images/trophy-average-low.svg', 'utf-8'),
    averageHigh: await readFile('src/images/trophy-average-high.svg', 'utf-8')
  }
  
  const latestCommit = commits[0]; // Assuming commits are sorted by date, latest first

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
}

function injectDataIntoTemplate(template: string, chartData: ChartData, commits: CommitData[]): string {
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
  
  // ContributorsChart class definition (converted from TypeScript)
  const contributorsChartClass = `
    function assert(condition, message) {
      if (!condition) throw new Error(message);
    }

    class ContributorsChart {
      constructor(containerId) {
        this.containerId = containerId;
        this.chart = null;
      }

      render(contributors) {
        assert(contributors !== undefined, 'Contributors data is required');
        assert(Array.isArray(contributors), 'Contributors must be an array');
        
        const container = document.querySelector('#' + this.containerId);
        assert(container !== null, 'Container with id ' + this.containerId + ' not found');
        
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
        
        this.chart = new ApexCharts(container, options);
        this.chart.render();
      }

      destroy() {
        if (this.chart) {
          this.chart.destroy();
          this.chart = null;
        }
      }
    }
  `;

  const chartScript = `
    <script>
      ${contributorsChartClass}

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
      let contributorsChart = null;
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
        if (contributorsChart) {
          contributorsChart.destroy();
          contributorsChart = null;
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
        renderUserCharts();
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
      
      function formatNumber(value) {
        return Math.abs(value).toLocaleString();
      }
      
      function createYAxisFormatter(metric) {
        return function(val) {
          const absVal = Math.abs(val);
          if (metric === 'bytes') {
            return formatBytes(absVal);
          }
          return formatNumber(absVal);
        };
      }
      
      function createTooltipFormatter(metric) {
        return function(val) {
          const prefix = val < 0 ? '-' : '';
          const absVal = Math.abs(val);
          if (metric === 'bytes') {
            return prefix + formatBytes(absVal);
          }
          return prefix + formatNumber(absVal);
        };
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
      
      function buildTimeSeriesData(data, xAxis, yValueExtractor) {
        if (xAxis === 'date') {
          return filteredTimeSeries.map(point => ({
            x: new Date(point.date).getTime(),
            y: yValueExtractor(point)
          }));
        } else {
          return data.map(point => ({
            x: point.commitIndex,
            y: yValueExtractor(point)
          }));
        }
      }
      
      function buildUserTimeSeriesData(userCommits, xAxis, metric) {
        const addedData = [];
        const removedData = [];
        const netData = [];
        
        if (xAxis === 'date') {
          let cumulativeAdded = 0;
          let cumulativeRemoved = 0;
          let cumulativeBytesAdded = 0;
          let cumulativeBytesRemoved = 0;
          
          // Group user commits by date (matching the format used in filteredTimeSeries)
          const userCommitsByDate = {};
          userCommits.forEach(commit => {
            // Use the same date key format as filteredTimeSeries (YYYY-MM-DD)
            const dateKey = new Date(commit.date).toISOString().split('T')[0];
            if (!userCommitsByDate[dateKey]) {
              userCommitsByDate[dateKey] = [];
            }
            userCommitsByDate[dateKey].push(commit);
          });
          
          // Use ONLY filteredTimeSeries dates to match other charts' x-axis
          const sortedDates = filteredTimeSeries.map(point => point.date);
          
          
          // Find the first date where this user has commits
          let firstUserCommitDate = null;
          for (const date of sortedDates) {
            const dateKey = date.split('T')[0];
            if (userCommitsByDate[dateKey] && userCommitsByDate[dateKey].length > 0) {
              firstUserCommitDate = date;
              break;
            }
          }
          
          // Add a zero point before the user's first commit
          if (firstUserCommitDate) {
            const firstCommitDate = new Date(firstUserCommitDate);
            const startDate = new Date(firstCommitDate);
            
            // Check if we're using hourly data (repo less than 2 days old)
            const firstDate = new Date(sortedDates[0]);
            const lastDate = new Date(sortedDates[sortedDates.length - 1]);
            const repoAgeHours = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60);
            const useHourlyData = repoAgeHours < 48;
            
            if (useHourlyData) {
              startDate.setHours(startDate.getHours() - 1); // One hour before
            } else {
              startDate.setDate(startDate.getDate() - 1); // One day before
            }
            
            const startTimestamp = startDate.getTime();
            addedData.push({ x: startTimestamp, y: 0 });
            removedData.push({ x: startTimestamp, y: 0 });
            netData.push({ x: startTimestamp, y: 0 });
          }
          
          sortedDates.forEach((date, index) => {
            // Skip dates before the user's first commit
            if (firstUserCommitDate && new Date(date) < new Date(firstUserCommitDate)) {
              return;
            }
            
            // Extract just the date part to match with userCommitsByDate
            const dateKey = date.split('T')[0];
            const dateContributions = userCommitsByDate[dateKey] ?? [];
            
            const dayAdded = dateContributions.reduce((sum, c) => sum + c.linesAdded, 0);
            const dayRemoved = dateContributions.reduce((sum, c) => sum + c.linesDeleted, 0);
            const dayBytesAdded = dateContributions.reduce((sum, c) => sum + (c.bytesAdded ?? c.linesAdded * 50), 0);
            const dayBytesRemoved = dateContributions.reduce((sum, c) => sum + (c.bytesDeleted ?? c.linesDeleted * 50), 0);
            
            cumulativeAdded += dayAdded;
            cumulativeRemoved += dayRemoved;
            cumulativeBytesAdded += dayBytesAdded;
            cumulativeBytesRemoved += dayBytesRemoved;
            
            // Add data point for this date
            const timestamp = new Date(date).getTime();
            if (metric === 'lines') {
              addedData.push({ x: timestamp, y: cumulativeAdded });
              removedData.push({ x: timestamp, y: -cumulativeRemoved });
              netData.push({ x: timestamp, y: cumulativeAdded - cumulativeRemoved });
            } else {
              addedData.push({ x: timestamp, y: cumulativeBytesAdded });
              removedData.push({ x: timestamp, y: -cumulativeBytesRemoved });
              netData.push({ x: timestamp, y: cumulativeBytesAdded - cumulativeBytesRemoved });
            }
          });
          
        } else {
          addedData.push({ x: 0, y: 0 });
          removedData.push({ x: 0, y: 0 });
          netData.push({ x: 0, y: 0 });
          
          let cumulativeAdded = 0;
          let cumulativeRemoved = 0;
          let cumulativeBytesAdded = 0;
          let cumulativeBytesRemoved = 0;
          
          userCommits.forEach((commit, i) => {
            const x = i + 1;
            cumulativeAdded += commit.linesAdded;
            cumulativeRemoved += commit.linesDeleted;
            const bytesAdded = commit.bytesAdded ?? commit.linesAdded * 50;
            const bytesRemoved = commit.bytesDeleted ?? commit.linesDeleted * 50;
            cumulativeBytesAdded += bytesAdded;
            cumulativeBytesRemoved += bytesRemoved;
            
            if (metric === 'lines') {
              addedData.push({ x, y: cumulativeAdded });
              removedData.push({ x, y: -cumulativeRemoved });
              netData.push({ x, y: cumulativeAdded - cumulativeRemoved });
            } else {
              addedData.push({ x, y: cumulativeBytesAdded });
              removedData.push({ x, y: -cumulativeBytesRemoved });
              netData.push({ x, y: cumulativeBytesAdded - cumulativeBytesRemoved });
            }
          });
        }
        
        return { addedData, removedData, netData };
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
            data: buildTimeSeriesData(
              filteredLinearSeries,
              xAxis,
              point => point.commits
            )
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
        if (contributorsChart) {
          contributorsChart.destroy();
        }
        contributorsChart = new ContributorsChart('contributorsChart');
        contributorsChart.render(filteredContributors);
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
            data: buildTimeSeriesData(
              filteredLinearSeries,
              xAxis,
              point => point.cumulativeLines
            )
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
            type: 'line', 
            height: 350, 
            toolbar: { show: false }, 
            background: isDark ? '#161b22' : '#ffffff'
          },
          series: [
            { 
              name: 'Lines Added', 
              data: buildTimeSeriesData(
                filteredLinearSeries,
                xAxis,
                point => point.linesAdded
              )
            },
            { 
              name: 'Lines Deleted', 
              data: buildTimeSeriesData(
                filteredLinearSeries,
                xAxis,
                point => point.linesDeleted
              )
            },
            { 
              name: 'Net Lines', 
              data: buildTimeSeriesData(
                filteredLinearSeries,
                xAxis,
                point => point.linesAdded - point.linesDeleted
              )
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
          stroke: {
            curve: 'smooth',
            width: 2
          },
          colors: isDark ? ['#3fb950', '#f85149', '#58a6ff'] : ['#87bc45', '#ea5545', '#27aeef'],
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
            data: buildTimeSeriesData(
              filteredLinearSeries,
              xAxis,
              point => point.cumulativeBytes
            )
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
          { title: 'Most Lines Removed', data: awards.mostLinesRemoved, formatValue: (v) => v.toLocaleString() + ' lines', trophy: trophySvgs.linesRemoved },
          { title: 'Smallest Average Changes', data: awards.lowestAverageLinesChanged, formatValue: (v) => v.toFixed(1) + ' lines/commit', showAuthor: false, trophy: trophySvgs.averageLow },
          { title: 'Largest Average Changes', data: awards.highestAverageLinesChanged, formatValue: (v) => v.toFixed(1) + ' lines/commit', showAuthor: false, trophy: trophySvgs.averageHigh }
        ];
        
        awardCategories.forEach(category => {
          const col = document.createElement('div');
          col.className = 'col-md-4 mb-4';
          
          const card = document.createElement('div');
          card.className = 'card h-100';
          
          const cardHeader = document.createElement('div');
          cardHeader.className = 'card-header d-flex justify-content-between align-items-center';
          
          const titleElement = document.createElement('h6');
          titleElement.className = 'mb-0';
          titleElement.textContent = category.title;
          cardHeader.appendChild(titleElement);

          // Trophy now inside the header, aligned with flexbox
          const trophyWrapper = document.createElement('div');
          trophyWrapper.style.cssText = 'width: 60px; height: 60px; flex-shrink: 0;';
          trophyWrapper.innerHTML = category.trophy;
          
          // Ensure SVG fits properly within the wrapper
          const svgElement = trophyWrapper.querySelector('svg');
          if (svgElement) {
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';
            svgElement.style.display = 'block';
          }
          cardHeader.appendChild(trophyWrapper);

          const cardBody = document.createElement('div');
          cardBody.className = 'card-body';
          
          const list = document.createElement('ol');
          list.className = 'mb-0';
          
          if (category.title === 'Top Contributors' || category.title === 'Smallest Average Changes' || category.title === 'Largest Average Changes') {
            category.data.forEach((contributor, index) => {
              const item = document.createElement('li');
              if (category.title === 'Top Contributors') {
                item.innerHTML = '<strong>' + contributor.name + '</strong>: ' + category.formatValue(contributor);
              } else {
                // For average changes awards
                item.innerHTML = 
                  '<div>' +
                  '<strong>' + contributor.name + '</strong><br>' +
                  '<small class="text-muted">' + contributor.commits + ' commits</small><br>' +
                  '<small class="text-muted">Average: ' + category.formatValue(contributor.averageLinesChanged) + '</small>' +
                  '</div>';
              }
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
      
      let userChartInstances = [];
      
      function createUserChartTooltip(xAxis, userCommits, metric) {
        return function({ seriesIndex, dataPointIndex, w }) {
          if (xAxis === 'commit' && dataPointIndex > 0) {
            const commit = userCommits[dataPointIndex - 1]; // -1 because we have a zero starting point
            if (commit) {
              const truncateMessage = function(msg, maxLength) {
                if (msg.length <= maxLength) return msg;
                return msg.substring(0, maxLength) + '...';
              };
              
              let content = '<div class="custom-tooltip">' +
                '<div class="tooltip-title">Commit #' + dataPointIndex + '</div>' +
                '<div class="tooltip-content">' +
                '<div><strong>SHA:</strong> ' + commit.sha.substring(0, 7) + '</div>' +
                '<div><strong>Date:</strong> ' + new Date(commit.date).toLocaleString() + '</div>' +
                '<div class="tooltip-message"><strong>Message:</strong> ' + truncateMessage(commit.message, 200) + '</div>';
              
              if (metric === 'lines') {
                content += '<div><strong>Lines Added:</strong> +' + commit.linesAdded.toLocaleString() + '</div>';
                content += '<div><strong>Lines Removed:</strong> -' + commit.linesDeleted.toLocaleString() + '</div>';
              } else {
                const bytesAdded = commit.bytesAdded || commit.linesAdded * 50;
                const bytesRemoved = commit.bytesDeleted || commit.linesDeleted * 50;
                content += '<div><strong>Bytes Added:</strong> +' + formatBytes(bytesAdded) + '</div>';
                content += '<div><strong>Bytes Removed:</strong> -' + formatBytes(bytesRemoved) + '</div>';
              }
              
              content += '</div></div>';
              return content;
            }
          }
          return null;
        };
      }
      
      function renderUserCharts() {
        const container = document.getElementById('userChartsContainer');
        container.innerHTML = '';
        
        // Destroy existing chart instances
        userChartInstances.forEach(chart => {
          if (chart) chart.destroy();
        });
        userChartInstances = [];
        
        // Get contributors sorted by commit count
        const sortedContributors = [...filteredContributors].sort((a, b) => b.commits - a.commits);
        
        sortedContributors.forEach((contributor, index) => {
          // Get commits for this user
          const userCommits = filteredCommits.filter(c => c.authorName === contributor.name);
          
          // Create chart container
          const col = document.createElement('div');
          col.className = 'col-12 mb-4';
          
          const card = document.createElement('div');
          card.className = 'card';
          
          const cardHeader = document.createElement('div');
          cardHeader.className = 'card-header';
          
          const titleWrapper = document.createElement('div');
          titleWrapper.className = 'd-flex justify-content-between align-items-center';
          
          const title = document.createElement('h5');
          title.className = 'card-title mb-0';
          title.textContent = contributor.name + ' - Code Changes';
          
          const stats = document.createElement('small');
          stats.className = 'text-muted';
          stats.textContent = contributor.commits + ' commits | +' + contributor.linesAdded.toLocaleString() + ' / -' + contributor.linesDeleted.toLocaleString() + ' lines';
          
          titleWrapper.appendChild(title);
          titleWrapper.appendChild(stats);
          cardHeader.appendChild(titleWrapper);
          
          const cardBody = document.createElement('div');
          cardBody.className = 'card-body';
          
          // Create controls
          const controls = document.createElement('div');
          controls.className = 'mb-3';
          
          // X-axis toggle
          const xAxisGroup = document.createElement('div');
          xAxisGroup.className = 'btn-group btn-group-sm me-3';
          xAxisGroup.setAttribute('role', 'group');
          
          const dateRadio = document.createElement('input');
          dateRadio.type = 'radio';
          dateRadio.className = 'btn-check';
          dateRadio.name = 'userXAxis' + index;
          dateRadio.id = 'userXAxisDate' + index;
          dateRadio.value = 'date';
          dateRadio.checked = true;
          
          const dateLabel = document.createElement('label');
          dateLabel.className = 'btn btn-outline-primary';
          dateLabel.setAttribute('for', 'userXAxisDate' + index);
          dateLabel.textContent = 'By Date';
          
          const commitRadio = document.createElement('input');
          commitRadio.type = 'radio';
          commitRadio.className = 'btn-check';
          commitRadio.name = 'userXAxis' + index;
          commitRadio.id = 'userXAxisCommit' + index;
          commitRadio.value = 'commit';
          
          const commitLabel = document.createElement('label');
          commitLabel.className = 'btn btn-outline-primary';
          commitLabel.setAttribute('for', 'userXAxisCommit' + index);
          commitLabel.textContent = 'By Commit';
          
          xAxisGroup.appendChild(dateRadio);
          xAxisGroup.appendChild(dateLabel);
          xAxisGroup.appendChild(commitRadio);
          xAxisGroup.appendChild(commitLabel);
          
          // Metric toggle
          const metricGroup = document.createElement('div');
          metricGroup.className = 'btn-group btn-group-sm';
          metricGroup.setAttribute('role', 'group');
          
          const linesRadio = document.createElement('input');
          linesRadio.type = 'radio';
          linesRadio.className = 'btn-check';
          linesRadio.name = 'userMetric' + index;
          linesRadio.id = 'userMetricLines' + index;
          linesRadio.value = 'lines';
          linesRadio.checked = true;
          
          const linesLabel = document.createElement('label');
          linesLabel.className = 'btn btn-outline-secondary';
          linesLabel.setAttribute('for', 'userMetricLines' + index);
          linesLabel.textContent = 'Lines';
          
          const bytesRadio = document.createElement('input');
          bytesRadio.type = 'radio';
          bytesRadio.className = 'btn-check';
          bytesRadio.name = 'userMetric' + index;
          bytesRadio.id = 'userMetricBytes' + index;
          bytesRadio.value = 'bytes';
          
          const bytesLabel = document.createElement('label');
          bytesLabel.className = 'btn btn-outline-secondary';
          bytesLabel.setAttribute('for', 'userMetricBytes' + index);
          bytesLabel.textContent = 'Bytes';
          
          metricGroup.appendChild(linesRadio);
          metricGroup.appendChild(linesLabel);
          metricGroup.appendChild(bytesRadio);
          metricGroup.appendChild(bytesLabel);
          
          controls.appendChild(xAxisGroup);
          controls.appendChild(metricGroup);
          
          // Create chart container
          const chartDiv = document.createElement('div');
          chartDiv.id = 'userChart' + index;
          
          cardBody.appendChild(controls);
          cardBody.appendChild(chartDiv);
          card.appendChild(cardHeader);
          card.appendChild(cardBody);
          col.appendChild(card);
          container.appendChild(col);
          
          // Render the chart
          function renderUserChart() {
            const xAxis = document.querySelector('input[name="userXAxis' + index + '"]:checked').value;
            const metric = document.querySelector('input[name="userMetric' + index + '"]:checked').value;
            const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
            
            // Prepare data using the common builder
            const { addedData, removedData, netData } = buildUserTimeSeriesData(userCommits, xAxis, metric);
            
            // Destroy existing chart
            if (userChartInstances[index]) {
              userChartInstances[index].destroy();
            }
            
            const options = {
              chart: {
                type: 'line',
                height: 350,
                toolbar: { show: false },
                background: isDark ? '#161b22' : '#ffffff'
              },
              series: [
                {
                  name: metric === 'lines' ? 'Total Lines Added' : 'Total Bytes Added',
                  data: addedData
                },
                {
                  name: metric === 'lines' ? 'Total Lines Removed' : 'Total Bytes Removed',
                  data: removedData
                },
                {
                  name: metric === 'lines' ? 'Net Lines' : 'Net Bytes',
                  data: netData
                }
              ],
              stroke: {
                curve: 'smooth',
                width: 2
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
                  text: metric === 'lines' ? 'Lines' : 'Bytes',
                  style: { color: isDark ? '#f0f6fc' : '#24292f' }
                },
                labels: {
                  style: { colors: isDark ? '#f0f6fc' : '#24292f' },
                  formatter: createYAxisFormatter(metric)
                }
              },
              colors: isDark ? ['#3fb950', '#f85149', '#58a6ff'] : ['#87bc45', '#ea5545', '#27aeef'],
              grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
              tooltip: {
                theme: isDark ? 'dark' : 'light',
                x: {
                  format: xAxis === 'date' ? 'dd MMM yyyy' : undefined
                },
                y: {
                  formatter: createTooltipFormatter(metric)
                },
                custom: xAxis === 'commit' ? createUserChartTooltip(xAxis, userCommits, metric) : undefined
              }
            };
            
            userChartInstances[index] = new ApexCharts(document.getElementById('userChart' + index), options);
            userChartInstances[index].render();
          }
          
          renderUserChart();
          
          // Add event listeners
          dateRadio.addEventListener('change', renderUserChart);
          commitRadio.addEventListener('change', renderUserChart);
          linesRadio.addEventListener('change', renderUserChart);
          bytesRadio.addEventListener('change', renderUserChart);
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
        renderUserCharts();
        
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
            renderUserCharts();
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