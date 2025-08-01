import type { ApexOptions } from 'apexcharts'
import type { ContributorStats, FileTypeStats, WordFrequency, FileHeatData, TimeSeriesPoint } from '../../data/types.js'

export interface ChartDefinition {
  type: 'line' | 'area' | 'bar' | 'donut' | 'heatmap' | 'treemap' | 'radialBar' | 'rangeBar'
  hasAxisToggle: boolean
  defaultAxis?: 'date' | 'commit'
  height: number
  elementId: string
  dataFormatter: (data: any, options?: any) => any
  optionsBuilder: (series: any, config?: any) => ApexOptions
  // For charts that need special event handling
  eventHandlers?: {
    onDataPointSelection?: (manager: any, event: any, chartContext: any, config: any) => void
  }
}

// Start with contributors chart as proof of concept
export const CHART_DEFINITIONS: Record<string, ChartDefinition> = {
  contributors: {
    type: 'bar',
    hasAxisToggle: false,
    height: 350,
    elementId: 'contributorsChart',
    dataFormatter: (contributors: ContributorStats[], options?: { limit?: number }) => {
      if (!Array.isArray(contributors)) {
        throw new Error(`contributors: Expected array of ContributorStats, got ${typeof contributors}`)
      }
      
      const limit = options?.limit ?? 10
      const topContributors = contributors.slice(0, limit)
      
      // Validate each contributor
      topContributors.forEach((c, index) => {
        if (!c) {
          throw new Error(`contributors: Contributor at index ${index} is null/undefined`)
        }
        if (!c.name || typeof c.name !== 'string') {
          throw new Error(`contributors: Contributor at index ${index} has invalid name: ${c.name}`)
        }
        if (typeof c.commits !== 'number' || c.commits < 0) {
          throw new Error(`contributors: Contributor '${c.name}' has invalid commits count: ${c.commits}`)
        }
      })
      
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
  },

  fileTypes: {
    type: 'donut',
    hasAxisToggle: false,
    height: 350,
    elementId: 'fileTypesChart',
    dataFormatter: (fileTypes: FileTypeStats[]) => {
      if (!Array.isArray(fileTypes)) {
        throw new Error(`fileTypes: Expected array of FileTypeStats, got ${typeof fileTypes}`)
      }
      
      const topFileTypes = fileTypes.slice(0, 10)
      
      // Validate each file type
      topFileTypes.forEach((ft, index) => {
        if (!ft) {
          throw new Error(`fileTypes: FileType at index ${index} is null/undefined`)
        }
        if (!ft.type || typeof ft.type !== 'string') {
          throw new Error(`fileTypes: FileType at index ${index} has invalid type: ${ft.type}`)
        }
        if (typeof ft.lines !== 'number' || ft.lines < 0) {
          throw new Error(`fileTypes: FileType '${ft.type}' has invalid lines count: ${ft.lines}`)
        }
      })
      
      if (topFileTypes.length === 0) {
        throw new Error('fileTypes: No file type data available')
      }
      
      return {
        series: topFileTypes.map(ft => ft.lines),
        labels: topFileTypes.map(ft => ft.type),
        data: topFileTypes // Store for event handling
      }
    },
    optionsBuilder: (data, manager) => ({
      chart: {
        type: 'donut',
        height: 350,
        background: '#ffffff',
        events: {
          dataPointSelection: function(_event: any, _chartContext: any, config: any) {
            const selectedType = data.labels[config.dataPointIndex]
            const currentFilter = manager?.getFileTypeFilter?.()
            
            if (currentFilter === selectedType) {
              manager?.setFileTypeFilter?.(null)
            } else {
              manager?.setFileTypeFilter?.(selectedType)
            }
          }
        }
      },
      series: data.series,  // This is correct - donut charts want series at top level
      labels: data.labels,  // This is correct - donut charts want labels at top level
      colors: ['#FFB6C1', '#FFDAB9', '#FFE4B5', '#D8BFD8', '#87CEEB', '#98D8C8', '#B0C4DE', '#E6E6FA', '#F0E68C', '#D3D3D3'],
      dataLabels: {
        enabled: true,
        formatter: function(val: number, opts: any) {
          const name = opts.w.globals.labels[opts.seriesIndex]
          return name + ': ' + val.toFixed(1) + '%'
        },
        style: {
          fontSize: '12px',
          fontFamily: 'inherit',
          fontWeight: '400',
          colors: ['#24292f']
        }
      },
      legend: {
        position: 'bottom',
        labels: { colors: '#24292f' }
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: function(val: number) {
            return val.toLocaleString() + ' lines'
          }
        }
      }
    })
  },

  wordCloud: {
    type: 'treemap',
    hasAxisToggle: false,
    height: 400,
    elementId: 'wordCloudChart',
    dataFormatter: (wordFrequency: WordFrequency[]) => {
      if (!Array.isArray(wordFrequency)) {
        throw new Error(`wordCloud: Expected array of WordFrequency, got ${typeof wordFrequency}`)
      }
      
      // Validate data early and show what's wrong
      const invalidEntries: any[] = []
      wordFrequency.forEach((w, index) => {
        if (!w) {
          invalidEntries.push({ index, entry: w, reason: 'null/undefined' })
        } else if (typeof w.word !== 'string' || !w.word) {
          invalidEntries.push({ index, entry: w, reason: `invalid word: ${w.word}` })
        } else if (typeof w.count !== 'number' || w.count < 0) {
          invalidEntries.push({ index, entry: w, reason: `invalid count: ${w.count}` })
        }
      })
      
      if (invalidEntries.length > 0) {
        console.error('Invalid word frequency entries:', invalidEntries.slice(0, 5)) // Show first 5
        // Don't throw - filter them out instead
        console.warn(`wordCloud: Filtering out ${invalidEntries.length} invalid entries`)
      }
      
      // Filter out invalid entries and take top 50 valid ones
      const validWords = wordFrequency.filter(w => 
        w && 
        typeof w.word === 'string' && 
        w.word.trim() !== '' && 
        typeof w.count === 'number' && 
        w.count >= 0
      )
      
      const topWords = validWords.slice(0, 50)
      
      if (topWords.length === 0) {
        throw new Error('wordCloud: No valid word frequency data after filtering')
      }
      
      return [{
        data: topWords.map(w => ({
          x: w.word,
          y: w.count
        }))
      }]
    },
    optionsBuilder: (series) => ({
      chart: {
        type: 'treemap',
        height: 400,
        toolbar: { show: false },
        background: '#ffffff'
      },
      series,
      colors: ['#FFB6C1', '#FFDAB9', '#FFE4B5', '#D8BFD8', '#87CEEB', '#98D8C8', '#B0C4DE', '#E6E6FA', '#F0E68C', '#D3D3D3'],
      plotOptions: {
        treemap: {
          distributed: true,
          enableShades: true,
          shadeIntensity: 0.5,
          dataLabels: {
            format: 'truncate'
          }
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '14px',
          fontWeight: '600',
          colors: ['#24292f']
        },
        formatter: function(text: string, op: any) {
          return [text, op.value]
        },
        offsetY: -4
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: function(value: number) {
            return value + ' occurrences'
          }
        }
      },
      grid: {
        borderColor: '#e1e4e8'
      }
    })
  },

  fileHeatmap: {
    type: 'treemap',
    hasAxisToggle: false,
    height: 400,
    elementId: 'fileHeatmapChart',
    dataFormatter: (fileHeatData: FileHeatData[], options?: { maxFiles?: number, manager?: any }) => {
      if (!Array.isArray(fileHeatData)) {
        throw new Error(`fileHeatmap: Expected array of FileHeatData, got ${typeof fileHeatData}`)
      }
      
      const maxFiles = options?.maxFiles ?? 100
      
      // Apply file type filter if active
      let filteredData = fileHeatData
      const currentFileType = options?.manager?.getFileTypeFilter?.()
      if (currentFileType) {
        filteredData = fileHeatData.filter(file => file.fileType === currentFileType)
      }
      
      // Limit files and prepare data
      const limitedData = filteredData.slice(0, maxFiles)
      
      // Validate each file
      limitedData.forEach((file, index) => {
        if (!file) {
          throw new Error(`fileHeatmap: File at index ${index} is null/undefined`)
        }
        if (!file.fileName || typeof file.fileName !== 'string') {
          throw new Error(`fileHeatmap: File at index ${index} has invalid fileName: ${file.fileName}`)
        }
        if (typeof file.totalLines !== 'number' || file.totalLines < 0) {
          throw new Error(`fileHeatmap: File '${file.fileName}' has invalid totalLines: ${file.totalLines}`)
        }
      })
      
      return [{
        data: limitedData.map(file => ({
          x: file.fileName,
          y: file.totalLines,
          meta: file // Store for tooltip
        }))
      }]
    },
    optionsBuilder: (series, options) => ({
      chart: {
        type: 'treemap',
        height: options?.height ?? 400,
        toolbar: { show: false },
        background: '#ffffff'
      },
      series,
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '12px',
          colors: ['#24292f']
        },
        formatter: function(val: string, opts: any) {
          return [val, opts.value.toLocaleString() + ' lines'].join('\n')
        }
      },
      plotOptions: {
        treemap: {
          enableShades: true,
          shadeIntensity: 0.5,
          reverseNegativeShade: true,
          colorScale: {
            ranges: [{
              from: 0,
              to: 50,
              color: '#E6F3E6'
            }, {
              from: 51,
              to: 200,
              color: '#C7E9C7'
            }, {
              from: 201,
              to: 500,
              color: '#A8D5A8'
            }, {
              from: 501,
              to: 99999,
              color: '#8FBC8F'
            }]
          }
        }
      },
      tooltip: {
        theme: 'light',
        custom: function({dataPointIndex, w}: any) {
          const file = w.config.series[0].data[dataPointIndex]?.meta
          if (!file) return ''
          return `
            <div class="p-2">
              <strong>${file.fileName}</strong><br/>
              Lines: ${file.totalLines.toLocaleString()}<br/>
              Commits: ${file.commitCount}<br/>
              Type: ${file.fileType}<br/>
              Last modified: ${new Date(file.lastModified).toLocaleDateString()}
            </div>
          `
        }
      }
    })
  },

  commitActivity: {
    type: 'bar',
    hasAxisToggle: false,
    height: 350,
    elementId: 'commitActivityChart',
    dataFormatter: (timeSeries: TimeSeriesPoint[]) => {
      if (!Array.isArray(timeSeries)) {
        throw new Error(`commitActivity: Expected array of TimeSeriesPoint, got ${typeof timeSeries}`)
      }
      
      if (timeSeries.length === 0) {
        throw new Error('commitActivity: No time series data provided')
      }
      
      // Validate each time series point
      timeSeries.forEach((point, index) => {
        if (!point) {
          throw new Error(`commitActivity: TimeSeriesPoint at index ${index} is null/undefined`)
        }
        if (!point.date || typeof point.date !== 'string') {
          throw new Error(`commitActivity: TimeSeriesPoint at index ${index} has invalid date: ${point.date}`)
        }
        if (typeof point.commits !== 'number' || point.commits < 0) {
          throw new Error(`commitActivity: TimeSeriesPoint at ${point.date} has invalid commits count: ${point.commits}`)
        }
      })

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

      return { 
        series: [{ name: 'Commits', data }], 
        bucketType,
        bucketCount: data.length
      }
    },
    optionsBuilder: (data) => ({
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
}