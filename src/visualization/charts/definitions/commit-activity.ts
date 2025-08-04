import type { ApexOptions } from 'apexcharts'
import type { TimeSeriesPoint } from '../../../data/types.js'
import type { ChartDefinition } from '../chart-definitions.js'
import { CHART_COLORS } from '../shared/colors.js'
import { createBaseChartOptions, createAxisOptions, createTooltipOptions } from '../shared/common-options.js'
import { validateArrayInput, validateTimeSeriesPoint } from '../shared/validators.js'

export const commitActivityChart: ChartDefinition = {
  type: 'bar',
  hasAxisToggle: false,
  height: 350,
  elementId: 'commitActivityChart',
  dataFormatter: (timeSeries: TimeSeriesPoint[]) => {
    const validatedSeries = validateArrayInput(timeSeries, 'commitActivity')
    
    if (validatedSeries.length === 0) {
      throw new Error('commitActivity: No time series data provided')
    }
    
    validatedSeries.forEach((point, index) => {
      validateTimeSeriesPoint(point, index, 'commitActivity')
      if (typeof point.commits !== 'number' || point.commits < 0) {
        throw new Error(`commitActivity: TimeSeriesPoint at ${point.date} has invalid commits count: ${point.commits}`)
      }
    })

    const dates = validatedSeries.map(point => new Date(point.date).getTime())
    const minDate = Math.min(...dates)
    const maxDate = Math.max(...dates)
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24))

    let bucketType: 'Day' | 'Week' | 'Month'
    if (totalDays <= 50) {
      bucketType = 'Day'
    } else if (Math.ceil(totalDays / 7) <= 50) {
      bucketType = 'Week'
    } else {
      bucketType = 'Month'
    }

    const buckets = new Map<number, number>()

    for (const point of validatedSeries) {
      const pointDate = new Date(point.date).getTime()
      let bucketStart: number

      if (bucketType === 'Day') {
        const date = new Date(pointDate)
        date.setHours(0, 0, 0, 0)
        bucketStart = date.getTime()
      } else if (bucketType === 'Week') {
        const date = new Date(pointDate)
        const dayOfWeek = date.getDay()
        const diff = date.getDate() - dayOfWeek
        const weekStart = new Date(date.setDate(diff))
        weekStart.setHours(0, 0, 0, 0)
        bucketStart = weekStart.getTime()
      } else {
        const date = new Date(pointDate)
        date.setDate(1)
        date.setHours(0, 0, 0, 0)
        bucketStart = date.getTime()
      }

      buckets.set(bucketStart, (buckets.get(bucketStart) || 0) + point.commits)
    }

    const data = Array.from(buckets.entries())
        .map(([x, y]) => ({ x, y }))
        .sort((a, b) => a.x - b.x)
        .slice(0, 50)

    return { 
      series: [{ name: 'Commits', data }], 
      bucketType,
      bucketCount: data.length
    }
  },
  optionsBuilder: (data): ApexOptions => ({
    ...createBaseChartOptions('bar', 350),
    chart: {
      ...createBaseChartOptions('bar', 350).chart,
      id: 'commit-activity-chart',
      zoom: {
        enabled: true,
        allowMouseWheelZoom: false
      }
    },
    series: data.series,
    plotOptions: {
      bar: {
        columnWidth: '80%',
        borderRadius: 2
      }
    },
    xaxis: {
      type: 'datetime',
      title: {
        text: `${data.bucketType} (${data.bucketCount} ${data.bucketType.toLowerCase()}s)`,
        style: { color: '#24292f' }
      },
      labels: {
        datetimeUTC: false,
        style: { colors: '#24292f' },
        datetimeFormatter: data.bucketType === 'Day' ? {
          day: 'dd MMM',
          month: 'MMM yyyy'
        } : data.bucketType === 'Week' ? {
          day: 'dd MMM',
          month: 'MMM yyyy'  
        } : {
          month: 'MMM yyyy',
          year: 'yyyy'
        }
      }
    },
    yaxis: {
      ...createAxisOptions('Number of Commits'),
      min: 0
    },
    colors: [CHART_COLORS.primary],
    dataLabels: {
      enabled: false
    },
    tooltip: {
      ...createTooltipOptions(),
      x: {
        formatter: function(val: number) {
          const date = new Date(val)
          if (data.bucketType === 'Day') {
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          } else if (data.bucketType === 'Week') {
            const endDate = new Date(date)
            endDate.setDate(endDate.getDate() + 6)
            return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          } else {
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }
        }
      }
    }
  })
}