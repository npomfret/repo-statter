import type { TimeSeriesPoint } from '../../data/types.js'
import { chartRefs } from './chart-state.js'

interface BucketedData {
  data: Array<{ x: number; y: number }>
  bucketType: 'Day' | 'Week' | 'Month'
}

function createCommitActivityBuckets(timeSeries: TimeSeriesPoint[]): BucketedData {
  if (timeSeries.length === 0) {
    return { data: [], bucketType: 'Day' }
  }

  const dates = timeSeries.map(point => new Date(point.date).getTime())
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

  for (const point of timeSeries) {
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

  return { data, bucketType }
}

export function renderCommitActivityChart(timeSeries: TimeSeriesPoint[]): void {
  const container = document.getElementById('commitActivityChart')
  if (!container) return


  const bucketedData = createCommitActivityBuckets(timeSeries)

  const options = {
    chart: {
      id: 'commit-activity-chart',
      type: 'bar',
      height: 350,
      toolbar: { show: false },
      background: '#ffffff',
      zoom: {
        enabled: true,
        allowMouseWheelZoom: false
      }
    },
    series: [{
      name: 'Commits',
      data: bucketedData.data
    }],
    plotOptions: {
      bar: {
        columnWidth: '80%',
        borderRadius: 2
      }
    },
    xaxis: {
      type: 'datetime',
      title: {
        text: `${bucketedData.bucketType} (${bucketedData.data.length} ${bucketedData.bucketType.toLowerCase()}s)`,
        style: { color: '#24292f' }
      },
      labels: {
        datetimeUTC: false,
        style: { colors: '#24292f' },
        datetimeFormatter: bucketedData.bucketType === 'Day' ? {
          day: 'dd MMM',
          month: 'MMM yyyy'
        } : bucketedData.bucketType === 'Week' ? {
          day: 'dd MMM',
          month: 'MMM yyyy'
        } : {
          month: 'MMM yyyy',
          year: 'yyyy'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Number of Commits',
        style: { color: '#24292f' }
      },
      min: 0,
      labels: { style: { colors: '#24292f' } }
    },
    colors: ['#87CEEB'],
    dataLabels: {
      enabled: false
    },
    grid: {
      borderColor: '#e1e4e8'
    },
    tooltip: {
      theme: 'light',
      x: {
        formatter: function(val: number) {
          const date = new Date(val)
          if (bucketedData.bucketType === 'Day') {
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          } else if (bucketedData.bucketType === 'Week') {
            const endDate = new Date(date)
            endDate.setDate(endDate.getDate() + 6)
            return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          } else {
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }
        }
      }
    }
  }

  const chart = new (window as any).ApexCharts(container, options)
  chart.render()
  chartRefs['commit-activity-chart'] = chart
}