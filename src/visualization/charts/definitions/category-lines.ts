import type { ApexOptions } from 'apexcharts'
import type { TimeSeriesPoint } from '../../../data/types.js'
import type { CommitData } from '../../../git/parser.js'
import type { ChartDefinition } from '../chart-definitions.js'
import { CHART_COLOR_PALETTES } from '../shared/colors.js'
import { createBaseChartOptions, createDateTimeAxisOptions, createNumericAxisOptions, createLegendOptions, createTooltipOptions } from '../shared/common-options.js'
import { validateTimeSeriesPoint } from '../shared/validators.js'

export const categoryLinesChart: ChartDefinition = {
  type: 'line',
  hasAxisToggle: true,
  defaultAxis: 'commit',
  height: 350,
  elementId: 'categoryLinesChart',
  dataFormatter: (data: { timeSeries: TimeSeriesPoint[], commits: CommitData[] }, options?: { axisMode?: 'date' | 'commit' }) => {
    const mode = options?.axisMode || 'commit'
    
    if (!data.timeSeries || !Array.isArray(data.timeSeries)) {
      throw new Error('categoryLines: timeSeries must be an array')
    }
    if (!data.commits || !Array.isArray(data.commits)) {
      throw new Error('categoryLines: commits must be an array')
    }
    
    const categories = ['application', 'test', 'build', 'documentation', 'other'] as const
    const categoryNames = {
      application: 'Application',
      test: 'Test',
      build: 'Build',
      documentation: 'Documentation',
      other: 'Other'
    }
    const categoryColors = {
      application: CHART_COLOR_PALETTES.pastel[0],
      test: CHART_COLOR_PALETTES.pastel[3],
      build: CHART_COLOR_PALETTES.pastel[1],
      documentation: CHART_COLOR_PALETTES.pastel[5],
      other: CHART_COLOR_PALETTES.pastel[8]
    }
    
    const series: any[] = []
    
    if (mode === 'date') {
      data.timeSeries.forEach((point, index) => {
        validateTimeSeriesPoint(point, index, 'categoryLines')
        if (!point.cumulativeLines || typeof point.cumulativeLines !== 'object') {
          throw new Error(`categoryLines: TimeSeriesPoint at ${point.date} has invalid cumulativeLines`)
        }
      })
      
      for (const category of categories) {
        const categoryData = data.timeSeries.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.cumulativeLines[category] || 0
        }))
        
        series.push({
          name: categoryNames[category],
          data: categoryData,
          color: categoryColors[category]
        })
      }
    } else {
      const commitIndexMap = new Map<string, number>()
      data.commits.forEach((commit, index) => {
        commitIndexMap.set(commit.sha, index)
      })
      
      const commitCumulatives: { [category: string]: (number | null)[] } = {
        application: new Array(data.commits.length).fill(null),
        test: new Array(data.commits.length).fill(null),
        build: new Array(data.commits.length).fill(null),
        documentation: new Array(data.commits.length).fill(null),
        other: new Array(data.commits.length).fill(null)
      }
      
      data.timeSeries.forEach(point => {
        let latestIndex = -1
        if (point.commitShas && Array.isArray(point.commitShas)) {
          point.commitShas.forEach(sha => {
            const index = commitIndexMap.get(sha)
            if (index !== undefined && index > latestIndex) {
              latestIndex = index
            }
          })
        }
        
        if (latestIndex >= 0) {
          for (const category of categories) {
            commitCumulatives[category]![latestIndex] = point.cumulativeLines[category] || 0
          }
        }
      })
      
      for (const category of categories) {
        let lastValue = 0
        for (let i = 0; i < data.commits.length; i++) {
          if (commitCumulatives[category]![i] === null) {
            commitCumulatives[category]![i] = lastValue
          } else {
            lastValue = commitCumulatives[category]![i]!
          }
        }
      }
      
      for (const category of categories) {
        const categoryData = commitCumulatives[category]!.map((value, index) => ({
          x: index,
          y: value ?? 0
        }))
        
        series.push({
          name: categoryNames[category],
          data: categoryData,
          color: categoryColors[category]
        })
      }
    }
    
    return { series, mode, commits: data.commits }
  },
  optionsBuilder: (data): ApexOptions => {
    const baseOptions = {
      ...createBaseChartOptions('line', 350),
      chart: {
        ...createBaseChartOptions('line', 350).chart,
        id: 'category-lines-chart',
        zoom: {
          enabled: true,
          allowMouseWheelZoom: false,
          type: 'x' as const
        }
      },
      series: data.series,
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight' as const,
        width: 2
      },
      legend: {
        ...createLegendOptions('top'),
        horizontalAlign: 'left' as const
      },
      tooltip: createTooltipOptions()
    }
    
    if (data.mode === 'date') {
      return {
        ...baseOptions,
        xaxis: {
          ...createDateTimeAxisOptions('Date'),
          labels: {
            ...createDateTimeAxisOptions('Date').labels,
            datetimeFormatter: {
              year: 'yyyy',
              month: 'MMM yyyy',
              day: 'dd MMM',
              hour: 'HH:mm'
            }
          }
        },
        yaxis: {
          title: {
            text: 'Lines of Code',
            style: { color: '#24292f' }
          },
          min: 0,
          labels: {
            style: { colors: '#24292f' },
            formatter: function(val: number) {
              return val.toLocaleString()
            }
          }
        },
        tooltip: {
          ...createTooltipOptions(),
          x: {
            format: 'dd MMM yyyy'
          },
          y: {
            formatter: function(val: number) {
              return val ? val.toLocaleString() + ' lines' : '0 lines'
            }
          }
        }
      }
    } else {
      return {
        ...baseOptions,
        xaxis: {
          ...createNumericAxisOptions('Commit Number'),
          labels: {
            style: { colors: '#24292f' },
            formatter: function(val: string) {
              return Math.round(Number(val)).toString()
            }
          },
          tickAmount: 10
        },
        yaxis: {
          title: {
            text: 'Lines of Code',
            style: { color: '#24292f' }
          },
          min: 0,
          labels: {
            style: { colors: '#24292f' },
            formatter: function(val: number) {
              return val.toLocaleString()
            }
          }
        },
        tooltip: {
          ...createTooltipOptions(),
          custom: function({dataPointIndex, seriesIndex, w}: any) {
            const commitIndex = dataPointIndex
            if (commitIndex < 0 || commitIndex >= data.commits.length) return ''
            
            const commit = data.commits[commitIndex]
            const seriesName = w.config.series[seriesIndex].name
            const value = w.config.series[seriesIndex].data[dataPointIndex].y
            
            return `
              <div class="custom-tooltip">
                <div class="tooltip-title">Commit #${commitIndex + 1}</div>
                <div class="tooltip-content">
                  <div><strong>SHA:</strong> ${commit.sha.substring(0, 7)}</div>
                  <div><strong>Author:</strong> ${commit.authorName}</div>
                  <div><strong>Date:</strong> ${new Date(commit.date).toLocaleString()}</div>
                  <div><strong>${seriesName}:</strong> ${value.toLocaleString()} lines</div>
                </div>
              </div>
            `
          }
        }
      }
    }
  }
}