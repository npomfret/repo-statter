import type { ApexOptions } from 'apexcharts'
import type { ContributorStats } from '../../../data/types.js'
import type { ChartDefinition } from '../chart-definitions.js'
import { CHART_COLOR_PALETTES } from '../shared/colors.js'
import { createBaseChartOptions, createAxisOptions, createTooltipOptions } from '../shared/common-options.js'
import { validateArrayInput, validateContributor } from '../shared/validators.js'

export const contributorsChart: ChartDefinition = {
  type: 'bar',
  hasAxisToggle: false,
  height: 350,
  elementId: 'contributorsChart',
  dataFormatter: (contributors: ContributorStats[], options?: { limit?: number }) => {
    const validatedContributors = validateArrayInput(contributors, 'contributors')
    const limit = options?.limit ?? 10
    const topContributors = validatedContributors.slice(0, limit)
    
    topContributors.forEach((c, index) => validateContributor(c, index))
    
    return [{
      data: topContributors.map(c => ({
        x: c.name,
        y: c.commits,
        meta: c
      }))
    }]
  },
  optionsBuilder: (series): ApexOptions => ({
    ...createBaseChartOptions('bar', 350),
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
    colors: CHART_COLOR_PALETTES.pastel,
    dataLabels: {
      enabled: true,
      formatter: function(val: number) {
        return val.toString()
      },
      style: {
        colors: ['#24292f']
      }
    },
    xaxis: createAxisOptions('Number of Commits'),
    yaxis: {
      labels: { style: { colors: '#24292f' } }
    },
    tooltip: {
      ...createTooltipOptions(),
      y: {
        title: {
          formatter: function() { return 'Commits:' }
        }
      },
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