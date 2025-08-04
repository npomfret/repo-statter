import type { ApexOptions } from 'apexcharts'
import type { ChartDefinition } from '../chart-definitions.js'
import { CHART_COLOR_PALETTES } from '../shared/colors.js'
import { createBaseChartOptions, createDateTimeAxisOptions, createNumericAxisOptions, createLegendOptions, createTooltipOptions } from '../shared/common-options.js'

export const userChart: ChartDefinition = {
  type: 'area',
  hasAxisToggle: true,
  defaultAxis: 'commit',
  height: 250,
  elementId: '',
  dataFormatter: (data: any) => {
    const { userCommits, xAxisMode } = data
    
    if (xAxisMode === 'date') {
      const userActivityMap = new Map<string, { added: number, deleted: number }>()
      
      for (const commit of userCommits) {
        const dateKey = new Date(commit.date).toISOString().split('T')[0] || ''
        const existing = userActivityMap.get(dateKey) || { added: 0, deleted: 0 }
        existing.added += commit.linesAdded
        existing.deleted += commit.linesDeleted
        userActivityMap.set(dateKey, existing)
      }

      const dateData = Array.from(userActivityMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date: new Date(date).getTime(),
          added: data.added,
          deleted: data.deleted,
          net: data.added - data.deleted
        }))

      return [
        {
          name: 'Lines Added',
          data: dateData.map(d => ({ x: d.date, y: d.added }))
        },
        {
          name: 'Lines Deleted',
          data: dateData.map(d => ({ x: d.date, y: -d.deleted }))
        },
        {
          name: 'Net Lines',
          data: dateData.map(d => ({ x: d.date, y: d.net }))
        }
      ]
    } else {
      let cumulativeAdded = 0
      let cumulativeDeleted = 0
      
      const commitData = userCommits.map((commit: any, index: number) => {
        cumulativeAdded += commit.linesAdded
        cumulativeDeleted += commit.linesDeleted
        return {
          index: index + 1,
          added: cumulativeAdded,
          deleted: -cumulativeDeleted,
          net: cumulativeAdded - cumulativeDeleted
        }
      })

      return [
        {
          name: 'Lines Added',
          data: commitData.map((d: any) => ({ x: d.index, y: d.added }))
        },
        {
          name: 'Lines Deleted', 
          data: commitData.map((d: any) => ({ x: d.index, y: d.deleted }))
        },
        {
          name: 'Net Lines',
          data: commitData.map((d: any) => ({ x: d.index, y: d.net }))
        }
      ]
    }
  },
  optionsBuilder: (series, config): ApexOptions => ({
    ...createBaseChartOptions('area', 250),
    chart: {
      ...createBaseChartOptions('area', 250).chart,
      id: config.chartId,
      zoom: {
        enabled: true,
        allowMouseWheelZoom: false
      }
    },
    series,
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3
      }
    },
    colors: CHART_COLOR_PALETTES.gradient,
    xaxis: config.xAxisMode === 'date' ? {
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
    } : {
      ...createNumericAxisOptions('Commit Number'),
      labels: {
        style: { colors: '#24292f' },
        formatter: (val: string | number) => Math.floor(Number(val)).toString()
      }
    },
    yaxis: {
      title: {
        text: 'Lines Changed',
        style: { color: '#24292f' }
      },
      labels: {
        style: { colors: '#24292f' },
        formatter: (val: string | number) => Math.abs(Number(val)).toLocaleString()
      }
    },
    tooltip: {
      ...createTooltipOptions(),
      x: {
        formatter: config.xAxisMode === 'date' 
          ? (val: number) => new Date(val).toLocaleDateString()
          : (val: number) => `Commit #${val}`
      }
    },
    legend: {
      ...createLegendOptions('top'),
      horizontalAlign: 'right',
      fontSize: '12px'
    },
    dataLabels: { enabled: false }
  })
}

export const userActivityChart: ChartDefinition = {
  type: 'bar',
  hasAxisToggle: false,
  height: 200,
  elementId: '',
  dataFormatter: (commits: any[], options?: any) => {
    const commitsByDate = new Map<string, number>()
    
    for (const commit of commits) {
      const dateKey = new Date(commit.date).toISOString().split('T')[0] || ''
      commitsByDate.set(dateKey, (commitsByDate.get(dateKey) || 0) + 1)
    }

    const dates = Array.from(commitsByDate.keys()).sort()
    if (dates.length === 0) return [{ data: [] }]

    const startDate = options?.timeRange?.min ? new Date(options.timeRange.min) : new Date(dates[0] || new Date())
    const endDate = options?.timeRange?.max ? new Date(options.timeRange.max) : new Date(dates[dates.length - 1] || new Date())
    
    const allDates: { date: number; count: number }[] = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0] || ''
      allDates.push({
        date: currentDate.getTime(),
        count: commitsByDate.get(dateKey) || 0
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return [{
      name: 'Commits',
      data: allDates.map(d => ({ x: d.date, y: d.count }))
    }]
  },
  optionsBuilder: (series, config): ApexOptions => ({
    ...createBaseChartOptions('bar', 200),
    chart: {
      ...createBaseChartOptions('bar', 200).chart,
      id: config.chartId,
      zoom: {
        enabled: false
      }
    },
    series,
    plotOptions: {
      bar: {
        columnWidth: '90%',
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    colors: [CHART_COLOR_PALETTES.pastel[4]],
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
        text: 'Commits per Day',
        style: { color: '#24292f' }
      },
      labels: {
        style: { colors: '#24292f' },
        formatter: (val: string | number) => Math.floor(Number(val)).toString()
      }
    },
    tooltip: {
      ...createTooltipOptions(),
      x: {
        formatter: (val: number) => new Date(val).toLocaleDateString()
      },
      y: {
        formatter: (val: number) => `${val} commit${val !== 1 ? 's' : ''}`
      }
    }
  })
}