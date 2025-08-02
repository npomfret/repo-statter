import type { ApexOptions } from 'apexcharts'
import type { ContributorStats, FileTypeStats, FileHeatData, TimeSeriesPoint, LinearSeriesPoint } from '../../data/types.js'
import type { CommitData } from '../../git/parser.js'
import { formatBytes } from './chart-utils.js'

export interface ChartDefinition {
  type: 'line' | 'area' | 'bar' | 'donut' | 'heatmap' | 'treemap' | 'radialBar' | 'rangeBar' | 'd3-wordcloud'
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
    type: 'd3-wordcloud' as const,
    hasAxisToggle: false,
    height: 400,
    elementId: 'wordCloudChart',
    dataFormatter: (wordFrequency: any[]) => {
      if (!Array.isArray(wordFrequency)) {
        throw new Error(`wordCloud: Expected array of WordFrequency, got ${typeof wordFrequency}`)
      }
      
      // The data can come in two formats:
      // 1. { text: string, size: number } from text/processor.ts
      // 2. { word: string, count: number } from data/types.ts
      // We need to handle both
      
      // Normalize the data to a consistent format
      const normalizedData = wordFrequency.map((w, index) => {
        if (!w) {
          console.warn(`wordCloud: Entry at index ${index} is null/undefined`)
          return null
        }
        
        const text = w.text || w.word
        const count = w.size !== undefined ? w.size : w.count
        
        if (typeof text !== 'string' || !text.trim()) {
          console.warn(`wordCloud: Entry at index ${index} has invalid text: ${text}`)
          return null
        }
        
        if (typeof count !== 'number' || count < 0) {
          console.warn(`wordCloud: Entry at index ${index} has invalid count: ${count}`)
          return null
        }
        
        return { x: text, y: count }
      }).filter(w => w !== null)
      
      if (normalizedData.length === 0) {
        throw new Error('wordCloud: No valid word frequency data after normalization')
      }
      
      // Take top 50 words
      const topWords = normalizedData.slice(0, 50)
      
      return [{
        data: topWords
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
  },

  growth: {
    type: 'area',
    hasAxisToggle: true,
    defaultAxis: 'commit',
    height: 350,
    elementId: 'growthChart',
    dataFormatter: (data: { linearSeries: LinearSeriesPoint[], timeSeries: TimeSeriesPoint[], commits: CommitData[] }, options?: { axisMode?: 'date' | 'commit' }) => {
      const mode = options?.axisMode || 'commit'
      
      if (!data.linearSeries || !Array.isArray(data.linearSeries)) {
        throw new Error('growth: linearSeries must be an array')
      }
      if (!data.timeSeries || !Array.isArray(data.timeSeries)) {
        throw new Error('growth: timeSeries must be an array')
      }
      if (!data.commits || !Array.isArray(data.commits)) {
        throw new Error('growth: commits must be an array')
      }
      
      if (mode === 'date') {
        // Validate time series data
        data.timeSeries.forEach((point, index) => {
          if (!point) {
            throw new Error(`growth: TimeSeriesPoint at index ${index} is null/undefined`)
          }
          if (!point.date || typeof point.date !== 'string') {
            throw new Error(`growth: TimeSeriesPoint at index ${index} has invalid date: ${point.date}`)
          }
          if (!point.cumulativeLines || typeof point.cumulativeLines.total !== 'number') {
            throw new Error(`growth: TimeSeriesPoint at ${point.date} has invalid cumulativeLines`)
          }
          if (!point.cumulativeBytes || typeof point.cumulativeBytes.total !== 'number') {
            throw new Error(`growth: TimeSeriesPoint at ${point.date} has invalid cumulativeBytes`)
          }
        })
        
        return {
          series: [
            {
              name: 'Lines of Code',
              data: data.timeSeries.map(point => ({
                x: new Date(point.date).getTime(),
                y: point.cumulativeLines.total
              })),
              yAxisIndex: 0
            },
            {
              name: 'Repository Size',
              data: data.timeSeries.map(point => ({
                x: new Date(point.date).getTime(),
                y: point.cumulativeBytes.total
              })),
              yAxisIndex: 1
            }
          ],
          mode,
          linearSeries: data.linearSeries,
          commits: data.commits
        }
      } else {
        // Validate linear series data
        data.linearSeries.forEach((point, index) => {
          if (!point) {
            throw new Error(`growth: LinearSeriesPoint at index ${index} is null/undefined`)
          }
          if (typeof point.commitIndex !== 'number' || point.commitIndex < 0) {
            throw new Error(`growth: LinearSeriesPoint at index ${index} has invalid commitIndex: ${point.commitIndex}`)
          }
          if (typeof point.cumulativeLines !== 'number' || point.cumulativeLines < 0) {
            throw new Error(`growth: LinearSeriesPoint at index ${index} has invalid cumulativeLines: ${point.cumulativeLines}`)
          }
          if (typeof point.cumulativeBytes !== 'number' || point.cumulativeBytes < 0) {
            throw new Error(`growth: LinearSeriesPoint at index ${index} has invalid cumulativeBytes: ${point.cumulativeBytes}`)
          }
        })
        
        return {
          series: [
            {
              name: 'Lines of Code',
              data: data.linearSeries.map(point => ({
                x: point.commitIndex + 1,
                y: point.cumulativeLines
              })),
              yAxisIndex: 0
            },
            {
              name: 'Repository Size',
              data: data.linearSeries.map(point => ({
                x: point.commitIndex + 1,
                y: point.cumulativeBytes
              })),
              yAxisIndex: 1
            }
          ],
          mode,
          linearSeries: data.linearSeries,
          commits: data.commits
        }
      }
    },
    optionsBuilder: (data) => {
      const baseOptions = {
        chart: {
          id: 'growth-chart',
          type: 'area' as const,
          height: 350,
          toolbar: { show: false },
          background: '#ffffff',
          zoom: {
            enabled: true,
            allowMouseWheelZoom: false
          }
        },
        series: data.series,
        colors: [
          '#FFB6C1',  // Pastel pink for Lines of Code
          '#D8BFD8'   // Pastel lavender for Repository Size
        ],
        stroke: { curve: 'straight' as const, width: 2 },
        fill: {
          type: 'gradient',
          gradient: {
            opacityFrom: 0.6,
            opacityTo: 0.1
          }
        },
        legend: {
          position: 'top' as const,
          horizontalAlign: 'left' as const,
          labels: { colors: '#24292f' }
        },
        grid: { borderColor: '#e1e4e8' },
        dataLabels: { enabled: false },
        tooltip: {
          theme: 'light'
        }
      }
      
      if (data.mode === 'date') {
        return {
          ...baseOptions,
          xaxis: {
            type: 'datetime',
            title: {
              text: 'Date',
              style: { color: '#24292f' }
            },
            labels: {
              datetimeUTC: false,
              style: { colors: '#24292f' }
            }
          },
          yaxis: [
            {
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
            {
              opposite: true,
              title: {
                text: 'Repository Size',
                style: { color: '#24292f' }
              },
              min: 0,
              labels: {
                formatter: formatBytes,
                style: { colors: '#24292f' }
              }
            }
          ],
          tooltip: {
            theme: 'light',
            x: { format: 'dd MMM yyyy' }
          }
        }
      } else {
        // Commit mode
        return {
          ...baseOptions,
          xaxis: {
            type: 'numeric',
            title: {
              text: 'Commit Number',
              style: { color: '#24292f' }
            },
            labels: {
              style: { colors: '#24292f' },
              formatter: function(val: string) {
                return Math.round(Number(val)).toString()
              }
            },
            min: 1,
            max: data.linearSeries.length
          },
          yaxis: [
            {
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
            {
              opposite: true,
              title: {
                text: 'Repository Size',
                style: { color: '#24292f' }
              },
              min: 0,
              labels: {
                formatter: formatBytes,
                style: { colors: '#24292f' }
              }
            }
          ],
          tooltip: {
            theme: 'light',
            custom: function({dataPointIndex}: any) {
              const point = data.linearSeries[dataPointIndex]
              if (!point || point.sha === 'start') return ''

              const commit = data.commits.find((c: CommitData) => c.sha === point.sha)
              if (!commit) return ''

              const truncateMessage = (msg: string, maxLength: number) => {
                if (msg.length <= maxLength) return msg
                return msg.substring(0, maxLength) + '...'
              }

              let linesDisplay = ''
              const added = commit.linesAdded
              const deleted = commit.linesDeleted
              const net = point.netLines

              if (added > 0) {
                linesDisplay += '+' + added
              }
              if (deleted > 0) {
                if (linesDisplay !== '') {
                  linesDisplay += ' / '
                }
                linesDisplay += '-' + deleted
              }

              let netDisplay = ''
              if (added > 0 && deleted > 0) {
                netDisplay = ' (Net: ' + (net > 0 ? '+' : '') + net + ')'
              } else if (added === 0 && deleted === 0) {
                linesDisplay = '0'
              }

              const bytesAdded = commit.bytesAdded || 0
              const bytesDeleted = commit.bytesDeleted || 0
              let bytesDisplay = ''
              if (bytesAdded > 0) {
                bytesDisplay += '+' + formatBytes(bytesAdded)
              }
              if (bytesDeleted > 0) {
                if (bytesDisplay !== '') {
                  bytesDisplay += ' / '
                }
                bytesDisplay += '-' + formatBytes(bytesDeleted)
              }
              if (bytesAdded === 0 && bytesDeleted === 0) {
                bytesDisplay = '0 bytes'
              }

              return '<div class="custom-tooltip">' +
                  '<div class="tooltip-title">Commit #' + (point.commitIndex + 1) + '</div>' +
                  '<div class="tooltip-content">' +
                  '<div><strong>SHA:</strong> ' + commit.sha.substring(0, 7) + '</div>' +
                  '<div><strong>Author:</strong> ' + commit.authorName + '</div>' +
                  '<div><strong>Date:</strong> ' + new Date(commit.date).toLocaleString() + '</div>' +
                  '<div class="tooltip-message"><strong>Message:</strong> ' + truncateMessage(commit.message, 200) + '</div>' +
                  '<div><strong>Lines:</strong> ' + linesDisplay + netDisplay + '</div>' +
                  '<div><strong>Total Lines:</strong> ' + point.cumulativeLines.toLocaleString() + '</div>' +
                  '<div><strong>Bytes:</strong> ' + bytesDisplay + '</div>' +
                  '<div><strong>Total Size:</strong> ' + formatBytes(point.cumulativeBytes) + '</div>' +
                  '</div></div>'
            }
          }
        }
      }
    }
  },

  categoryLines: {
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
        application: '#FFB6C1',
        test: '#D8BFD8',
        build: '#FFDAB9',
        documentation: '#98D8C8',
        other: '#F0E68C'
      }
      
      const series: any[] = []
      
      if (mode === 'date') {
        // Validate time series data
        data.timeSeries.forEach((point, index) => {
          if (!point) {
            throw new Error(`categoryLines: TimeSeriesPoint at index ${index} is null/undefined`)
          }
          if (!point.date || typeof point.date !== 'string') {
            throw new Error(`categoryLines: TimeSeriesPoint at index ${index} has invalid date: ${point.date}`)
          }
          if (!point.cumulativeLines || typeof point.cumulativeLines !== 'object') {
            throw new Error(`categoryLines: TimeSeriesPoint at ${point.date} has invalid cumulativeLines`)
          }
        })
        
        for (const category of categories) {
          const data2 = data.timeSeries.map(point => ({
            x: new Date(point.date).getTime(),
            y: point.cumulativeLines[category] || 0
          }))
          
          series.push({
            name: categoryNames[category],
            data: data2,
            color: categoryColors[category]
          })
        }
      } else {
        // Commit mode - build commit index map
        const commitIndexMap = new Map<string, number>()
        data.commits.forEach((commit, index) => {
          commitIndexMap.set(commit.sha, index)
        })
        
        // Create arrays for each category indexed by commit
        const commitCumulatives: { [category: string]: (number | null)[] } = {
          application: new Array(data.commits.length).fill(null),
          test: new Array(data.commits.length).fill(null),
          build: new Array(data.commits.length).fill(null),
          documentation: new Array(data.commits.length).fill(null),
          other: new Array(data.commits.length).fill(null)
        }
        
        // Map time series points to commit indices
        data.timeSeries.forEach(point => {
          // Find the latest commit index for this time point
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
            // Update cumulative values for this commit index
            for (const category of categories) {
              commitCumulatives[category]![latestIndex] = point.cumulativeLines[category] || 0
            }
          }
        })
        
        // Fill in gaps by carrying forward the last known value
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
        
        // Create series for each category
        for (const category of categories) {
          const data2 = commitCumulatives[category]!.map((value, index) => ({
            x: index,
            y: value ?? 0
          }))
          
          series.push({
            name: categoryNames[category],
            data: data2,
            color: categoryColors[category]
          })
        }
      }
      
      return { series, mode, commits: data.commits }
    },
    optionsBuilder: (data) => {
      const baseOptions = {
        chart: {
          id: 'category-lines-chart',
          type: 'line' as const,
          height: 350,
          toolbar: { show: false },
          background: '#ffffff',
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
          position: 'top' as const,
          horizontalAlign: 'left' as const,
          labels: { colors: '#24292f' }
        },
        grid: {
          borderColor: '#e1e4e8'
        },
        tooltip: {
          theme: 'light'
        }
      }
      
      if (data.mode === 'date') {
        return {
          ...baseOptions,
          xaxis: {
            type: 'datetime',
            title: {
              text: 'Date',
              style: { color: '#24292f' }
            },
            labels: {
              datetimeFormatter: {
                year: 'yyyy',
                month: 'MMM yyyy',
                day: 'dd MMM',
                hour: 'HH:mm'
              },
              datetimeUTC: false,
              style: { colors: '#24292f' }
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
            theme: 'light',
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
        // Commit mode
        return {
          ...baseOptions,
          xaxis: {
            type: 'numeric',
            title: {
              text: 'Commit Number',
              style: { color: '#24292f' }
            },
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
            theme: 'light',
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
  },

  topFilesSize: {
    type: 'bar',
    hasAxisToggle: false,
    height: 350,
    elementId: 'topFilesChartSize',
    dataFormatter: (topFilesData: any) => {
      if (!topFilesData || !topFilesData.largest) {
        console.warn('topFilesSize: No data provided')
        return [{ data: [] }]
      }

      const files = topFilesData.largest.slice(0, 10)
      return [{
        name: 'Lines of Code',
        data: files.map((f: any) => ({
          x: f.fileName.split('/').pop() || f.fileName,
          y: f.value,
          fullPath: f.fileName
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
          horizontal: true
        }
      },
      dataLabels: {
        enabled: true,
        textAnchor: 'start',
        offsetX: -80,
        style: {
          fontSize: '12px',
          colors: ['#000000']
        },
        formatter: function(_val: number, opts: any) {
          const dataPoint = opts.w.config.series[0].data[opts.dataPointIndex]
          return dataPoint.x
        }
      },
      colors: ['#87CEEB'],
      xaxis: {
        title: {
          text: 'Lines of Code',
          style: { color: '#24292f' }
        },
        labels: {
          style: { colors: '#24292f' },
          formatter: (val: string | number) => Number(val).toLocaleString()
        }
      },
      yaxis: {
        labels: { show: false }
      },
      grid: {
        borderColor: '#e1e4e8'
      },
      tooltip: {
        theme: 'light',
        custom: function(opts: any) {
          const dataPoint = opts.w.config.series[0].data[opts.dataPointIndex]
          return `<div class="custom-tooltip">
            <div><strong>${dataPoint.fullPath}</strong></div>
            <div>${dataPoint.y.toLocaleString()} lines</div>
          </div>`
        }
      }
    })
  },

  topFilesChurn: {
    type: 'bar',
    hasAxisToggle: false,
    height: 350,
    elementId: 'topFilesChartChurn',
    dataFormatter: (topFilesData: any) => {
      if (!topFilesData || !topFilesData.mostChurn) {
        console.warn('topFilesChurn: No data provided')
        return [{ data: [] }]
      }

      const files = topFilesData.mostChurn.slice(0, 10)
      return [{
        name: 'Number of Changes',
        data: files.map((f: any) => ({
          x: f.fileName.split('/').pop() || f.fileName,
          y: f.value,
          fullPath: f.fileName
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
          horizontal: true
        }
      },
      dataLabels: {
        enabled: true,
        textAnchor: 'start',
        offsetX: -80,
        style: {
          fontSize: '12px',
          colors: ['#000000']
        },
        formatter: function(_val: number, opts: any) {
          const dataPoint = opts.w.config.series[0].data[opts.dataPointIndex]
          return dataPoint.x
        }
      },
      colors: ['#87CEEB'],
      xaxis: {
        title: {
          text: 'Number of Changes',
          style: { color: '#24292f' }
        },
        labels: {
          style: { colors: '#24292f' },
          formatter: (val: string | number) => Number(val).toLocaleString()
        }
      },
      yaxis: {
        labels: { show: false }
      },
      grid: {
        borderColor: '#e1e4e8'
      },
      tooltip: {
        theme: 'light',
        custom: function(opts: any) {
          const dataPoint = opts.w.config.series[0].data[opts.dataPointIndex]
          return `<div class="custom-tooltip">
            <div><strong>${dataPoint.fullPath}</strong></div>
            <div>${dataPoint.y.toLocaleString()} commits</div>
          </div>`
        }
      }
    })
  },

  topFilesComplex: {
    type: 'bar',
    hasAxisToggle: false,
    height: 350,
    elementId: 'topFilesChartComplex',
    dataFormatter: (topFilesData: any) => {
      if (!topFilesData || !topFilesData.mostComplex) {
        console.warn('topFilesComplex: No data provided')
        return [{ data: [] }]
      }

      const files = topFilesData.mostComplex.slice(0, 10)
      return [{
        name: 'Cyclomatic Complexity',
        data: files.map((f: any) => ({
          x: f.fileName.split('/').pop() || f.fileName,
          y: f.value,
          fullPath: f.fileName
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
          horizontal: true
        }
      },
      dataLabels: {
        enabled: true,
        textAnchor: 'start',
        offsetX: -80,
        style: {
          fontSize: '12px',
          colors: ['#000000']
        },
        formatter: function(_val: number, opts: any) {
          const dataPoint = opts.w.config.series[0].data[opts.dataPointIndex]
          return dataPoint.x
        }
      },
      colors: ['#87CEEB'],
      xaxis: {
        title: {
          text: 'Cyclomatic Complexity',
          style: { color: '#24292f' }
        },
        labels: {
          style: { colors: '#24292f' },
          formatter: (val: string | number) => Number(val).toLocaleString()
        }
      },
      yaxis: {
        labels: { show: false }
      },
      grid: {
        borderColor: '#e1e4e8'
      },
      tooltip: {
        theme: 'light',
        custom: function(opts: any) {
          const dataPoint = opts.w.config.series[0].data[opts.dataPointIndex]
          return `<div class="custom-tooltip">
            <div><strong>${dataPoint.fullPath}</strong></div>
            <div>Complexity: ${dataPoint.y}</div>
          </div>`
        }
      }
    })
  },

  // Dynamic user charts - created per contributor
  userChart: {
    type: 'area',
    hasAxisToggle: true,
    defaultAxis: 'commit',
    height: 250,
    elementId: '', // Dynamic - will be set when creating chart
    dataFormatter: (data: any) => {
      const { userCommits, xAxisMode } = data
      
      if (xAxisMode === 'date') {
        // Date-based view
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
        // Commit-based view
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
    optionsBuilder: (series, config) => ({
      chart: {
        id: config.chartId,
        type: 'area',
        height: 250,
        toolbar: { show: false },
        background: '#ffffff',
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
      colors: ['#90EE90', '#FFB6C1', '#87CEEB'],
      xaxis: config.xAxisMode === 'date' ? {
        type: 'datetime',
        title: {
          text: 'Date',
          style: { color: '#24292f' }
        },
        labels: {
          style: { colors: '#24292f' },
          datetimeFormatter: {
            year: 'yyyy',
            month: 'MMM yyyy',
            day: 'dd MMM',
            hour: 'HH:mm'
          }
        }
      } : {
        type: 'numeric',
        title: {
          text: 'Commit Number',
          style: { color: '#24292f' }
        },
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
      grid: {
        borderColor: '#e1e4e8'
      },
      tooltip: {
        theme: 'light',
        x: {
          formatter: config.xAxisMode === 'date' 
            ? (val: number) => new Date(val).toLocaleDateString()
            : (val: number) => `Commit #${val}`
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        labels: { colors: '#24292f' }
      },
      dataLabels: { enabled: false }
    })
  },

  userActivityChart: {
    type: 'bar',
    hasAxisToggle: false,
    height: 200,
    elementId: '', // Dynamic - will be set when creating chart
    dataFormatter: (commits: any[], options?: any) => {
      // Group commits by date
      const commitsByDate = new Map<string, number>()
      
      for (const commit of commits) {
        const dateKey = new Date(commit.date).toISOString().split('T')[0] || ''
        commitsByDate.set(dateKey, (commitsByDate.get(dateKey) || 0) + 1)
      }

      // Create a continuous date range
      const dates = Array.from(commitsByDate.keys()).sort()
      if (dates.length === 0) return [{ data: [] }]

      // Use provided time range or fall back to commit data range
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
    optionsBuilder: (series, config) => ({
      chart: {
        id: config.chartId,
        type: 'bar',
        height: 200,
        toolbar: { show: false },
        background: '#ffffff',
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
      colors: ['#87CEEB'],
      xaxis: {
        type: 'datetime',
        title: {
          text: 'Date',
          style: { color: '#24292f' }
        },
        labels: {
          style: { colors: '#24292f' },
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
      grid: {
        borderColor: '#e1e4e8'
      },
      tooltip: {
        theme: 'light',
        x: {
          formatter: (val: number) => new Date(val).toLocaleDateString()
        },
        y: {
          formatter: (val: number) => `${val} commit${val !== 1 ? 's' : ''}`
        }
      }
    })
  }
}