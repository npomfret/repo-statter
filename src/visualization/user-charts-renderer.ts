import type { CommitData } from '../git/parser.js'
import type { ContributorStats, TimeSeriesPoint, LinearSeriesPoint } from '../data/types.js'
import type { ChartManager } from './charts/index.js'

export function renderUserCharts(
  topContributors: ContributorStats[], 
  commits: CommitData[], 
  _linearSeries: LinearSeriesPoint[], 
  timeSeries: TimeSeriesPoint[],
  manager: ChartManager | null
): void {
  const container = document.getElementById('userChartsContainer')
  if (!container || !manager) {
    return
  }

  topContributors.forEach((contributor, index) => {
    const userCommits = commits.filter(c => c.authorName === contributor.name)

    const chartId = `userChart${index}`
    const activityChartId = `userActivityChart${index}`

    const chartCard = document.createElement('div')
    chartCard.className = 'chart-full'
    chartCard.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h5 class="card-title mb-0">${contributor.name}</h5>
          <p class="card-text small text-muted mb-0">${contributor.commits} commits • ${contributor.linesAdded + contributor.linesDeleted} lines changed</p>
        </div>
        <div class="card-body">
          <div class="btn-group btn-group-sm mb-3" role="group" data-toggle-id="userXAxis${index}">
            <input type="radio" class="btn-check" name="userXAxis${index}" id="userXAxis${index}Date" value="date" autocomplete="off">
            <label class="btn btn-outline-primary" for="userXAxis${index}Date">By Date</label>
            <input type="radio" class="btn-check" name="userXAxis${index}" id="userXAxis${index}Commit" value="commit" autocomplete="off" checked>
            <label class="btn btn-outline-primary" for="userXAxis${index}Commit">By Commit</label>
          </div>
          <div id="${chartId}" style="min-height: 250px;"></div>
          <div id="${activityChartId}" style="min-height: 200px; margin-top: 20px;"></div>
        </div>
      </div>
    `

    container.appendChild(chartCard)

    // Render charts immediately using ChartManager
    const xAxisMode = localStorage.getItem(`userChartXAxis${index}`) || 'commit'
    manager.create('userChart', { userCommits, xAxisMode, timeSeries }, { 
      elementId: chartId, 
      chartId: chartId,
      xAxisMode: xAxisMode 
    })
    
    manager.create('userActivityChart', userCommits, { 
      elementId: activityChartId,
      chartId: activityChartId
    })
    
    // Toggle handling is now done by setupUserChartToggles in chart-toggles.ts
  })
}