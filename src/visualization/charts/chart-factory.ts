import { CHART_DEFINITIONS, type ChartDefinition } from './chart-definitions.js'

declare global {
  interface Window {
    d3: any
  }
}

function renderD3WordCloud(container: HTMLElement, data: any, height: number) {
  // Clear container
  container.innerHTML = ''
  
  // Extract word data from the ApexCharts format
  const words = data[0]?.data || []
  if (!words.length) {
    container.innerHTML = '<div class="text-center text-muted" style="padding: 100px 0;">No word data available</div>'
    return
  }
  
  // D3 word cloud implementation
  const width = container.offsetWidth
  const d3 = (window as any).d3
  if (!d3 || !d3.layout?.cloud) {
    console.error('D3 or d3-cloud library not loaded')
    container.innerHTML = '<div class="text-center text-muted" style="padding: 100px 0;">Word cloud library not loaded</div>'
    return
  }
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
  
  const g = svg.append('g')
    .attr('transform', `translate(${width/2},${height/2})`)
  
  // Color scale
  const color = d3.scaleOrdinal(d3.schemeSet3)
  
  // Create the layout
  const layout = d3.layout.cloud()
    .size([width, height])
    .words(words.map((d: any) => ({ text: d.x, size: d.y })))
    .padding(5)
    .rotate(() => (Math.random() - 0.5) * 60)
    .font('Impact')
    .fontSize((d: any) => {
      const maxSize = Math.max(...words.map((w: any) => w.y))
      const minSize = Math.min(...words.map((w: any) => w.y))
      // Scale font sizes between 10 and 60 pixels
      return 10 + ((d.size - minSize) / (maxSize - minSize)) * 50
    })
    .on('end', draw)
  
  layout.start()
  
  function draw(words: any[]) {
    g.selectAll('text')
      .data(words)
      .enter().append('text')
      .style('font-size', (d: any) => `${d.size}px`)
      .style('font-family', 'Impact')
      .style('fill', (_d: any, i: number) => color(i.toString()))
      .attr('text-anchor', 'middle')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})rotate(${d.rotate})`)
      .text((d: any) => d.text)
      .append('title')
      .text((d: any) => {
        const count = data[0].data.find((w: any) => w.x === d.text)?.y || 0
        return `${d.text}: ${count} occurrences`
      })
  }
}

export interface ChartInstance {
  chart: ApexCharts
  definition: ChartDefinition
  data: any
  options?: any
}

export function createChart(
  chartType: string,
  data: any,
  options?: any
): ApexCharts | null {
  const definition = CHART_DEFINITIONS[chartType]
  if (!definition) {
    console.error(`Chart type "${chartType}" not found in definitions`)
    return null
  }
  
  // For dynamic charts like user charts, element ID can be passed in options
  const elementId = options?.elementId || definition.elementId
  const container = document.getElementById(elementId)
  if (!container) {
    console.error(`Container element "${elementId}" not found`)
    return null
  }
  
  try {
    let series
    try {
      series = definition.dataFormatter(data, options)
    } catch (dataError: any) {
      console.error(`Chart ${chartType} data validation failed:`, dataError.message)
      console.error('Input data:', data)
      console.error('Options:', options)
      throw dataError
    }
    
    // Handle D3 word cloud specially
    if (definition.type === 'd3-wordcloud') {
      renderD3WordCloud(container, series, definition.height)
      return null // Return null since it's not an ApexCharts instance
    }
    
    // Special handling for charts with empty data
    if (chartType === 'fileHeatmap' && series[0]?.data?.length === 0) {
      const currentFileType = options?.manager?.getFileTypeFilter?.()
      if (currentFileType) {
        container.innerHTML = `
          <div class="d-flex align-items-center justify-content-center h-100 text-muted" style="height: ${options?.height ?? 400}px;">
            <div class="text-center">
              <i class="bi bi-funnel fs-1 mb-3"></i>
              <p class="mb-0">No files with type "${currentFileType}" found</p>
            </div>
          </div>
        `
        return null
      }
    }
    
    // Validate series data before passing to ApexCharts
    if (!series) {
      console.error(`${chartType}: series is undefined or null`)
      return null
    }
    
    // Different validation for different chart types
    if (chartType === 'fileTypes') {
      // File types returns {series, labels, data}
      if (!series.series || !Array.isArray(series.series)) {
        console.error(`${chartType}: series.series is missing or not an array`)
        return null
      }
      if (!series.labels || !Array.isArray(series.labels)) {
        console.error(`${chartType}: series.labels is missing or not an array`)
        return null
      }
    } else if (chartType === 'commitActivity') {
      // Commit activity returns {series, bucketType, bucketCount}
      if (!series.series || !Array.isArray(series.series)) {
        console.error(`${chartType}: series.series is missing or not an array`)
        return null
      }
    } else if (Array.isArray(series)) {
      // For array series, check each item
      for (let i = 0; i < series.length; i++) {
        if (!series[i]) {
          console.error(`${chartType}: series[${i}] is undefined or null`)
          return null
        }
        if (series[i].data === undefined) {
          console.error(`${chartType}: series[${i}].data is undefined`)
          return null
        }
        // Extra validation for treemap data
        if (chartType === 'fileHeatmap' || chartType === 'wordCloud') {
          if (!Array.isArray(series[i].data)) {
            console.error(`${chartType}: series[${i}].data is not an array`)
            return null
          }
          // Check each data point
          for (let j = 0; j < series[i].data.length; j++) {
            const point = series[i].data[j]
            if (!point || typeof point !== 'object') {
              console.error(`${chartType}: series[${i}].data[${j}] is invalid`)
              return null
            }
            if (point.x === undefined || point.y === undefined) {
              console.error(`${chartType}: series[${i}].data[${j}] missing x or y`, point)
              return null
            }
          }
        }
      }
    }
    
    // Pass manager if provided in options for charts that need it (e.g., fileTypes)
    const chartOptions = definition.optionsBuilder(series, options?.manager || options)
    
    const chart = new (window as any).ApexCharts(container, chartOptions)
    chart.render()
    
    return chart
  } catch (error) {
    console.error(`Failed to create ${chartType} chart:`, error)
    return null
  }
}