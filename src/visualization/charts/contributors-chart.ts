import type { ContributorStats } from '../../data/types.js'
import { chartRefs } from './chart-state.js'

export function renderContributorsChart(contributors: ContributorStats[], limit: number): void {
  const container = document.getElementById('contributorsChart')
  if (!container) return

  const topContributors = contributors.slice(0, limit)

  const options = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: false },
      background: '#ffffff'
    },
    series: [{
      data: topContributors.map(c => ({
        x: c.name,
        y: c.commits
      }))
    }],
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        dataLabels: {
          position: 'top'
        }
      }
    },
    colors: ['#FFB6C1', '#FFDAB9', '#FFE4B5', '#D8BFD8', '#87CEEB', '#98D8C8', '#B0C4DE', '#E6E6FA', '#F0E68C', '#D3D3D3'],
    dataLabels: {
      enabled: true,
      formatter: function(val: number) {
        return val.toString()
      },
      style: {
        colors: ['#24292f']
      }
    },
    xaxis: {
      title: {
        text: 'Number of Commits',
        style: { color: '#24292f' }
      },
      labels: { style: { colors: '#24292f' } }
    },
    yaxis: {
      labels: { style: { colors: '#24292f' } }
    },
    grid: {
      borderColor: '#e1e4e8'
    },
    tooltip: {
      theme: 'light',
      y: {
        title: {
          formatter: function() { return 'Commits:' }
        }
      },
      marker: { show: false },
      custom: function({dataPointIndex}: any) {
        const contributor = topContributors[dataPointIndex]
        if (!contributor) return ''
        return `
          <div class="p-2">
            <strong>${contributor.name}</strong><br/>
            Commits: ${contributor.commits}<br/>
            Lines changed: ${(contributor.linesAdded + contributor.linesDeleted).toLocaleString()}<br/>
            Avg lines/commit: ${((contributor.linesAdded + contributor.linesDeleted) / contributor.commits).toFixed(1)}
          </div>
        `
      }
    }
  }

  const chart = new (window as any).ApexCharts(container, options)
  chart.render()
  chartRefs['contributorsChart'] = chart
}