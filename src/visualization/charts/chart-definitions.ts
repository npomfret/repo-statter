import type { ApexOptions } from 'apexcharts'
import type { ContributorStats } from '../../data/types.js'

export interface ChartDefinition {
  type: 'line' | 'area' | 'bar' | 'donut' | 'heatmap' | 'treemap' | 'radialBar' | 'rangeBar'
  hasAxisToggle: boolean
  defaultAxis?: 'date' | 'commit'
  height: number
  elementId: string
  dataFormatter: (data: any, options?: any) => any
  optionsBuilder: (series: any, config?: any) => ApexOptions
}

// Start with contributors chart as proof of concept
export const CHART_DEFINITIONS: Record<string, ChartDefinition> = {
  contributors: {
    type: 'bar',
    hasAxisToggle: false,
    height: 350,
    elementId: 'contributorsChart',
    dataFormatter: (contributors: ContributorStats[], options?: { limit?: number }) => {
      const limit = options?.limit ?? 10
      const topContributors = contributors.slice(0, limit)
      return [{
        data: topContributors.map(c => ({
          x: c.name,
          y: c.commits,
          meta: c // Store full data for tooltip
        }))
      }]
    },
    optionsBuilder: (series) => ({
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: false },
        background: '#ffffff'
      },
      series,
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
        custom: function({dataPointIndex, w}: any) {
          const contributor = w.config.series[0].data[dataPointIndex]?.meta
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
    })
  }
}