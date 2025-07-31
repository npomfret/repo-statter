import type { FileHeatData } from '../../data/types.js'
import { chartRefs, chartData, getSelectedFileType } from './chart-state.js'

export function renderFileHeatmapChart(fileHeatData: FileHeatData[], height: number, maxFiles: number): void {
  const container = document.getElementById('fileHeatmapChart')
  if (!container) return


  // Store original data for filtering
  chartData['fileHeatmapChart'] = { fileHeatData, height, maxFiles }

  // Apply file type filter if active
  let filteredData = fileHeatData
  const currentFileType = getSelectedFileType()
  if (currentFileType) {
    filteredData = fileHeatData.filter(file => file.fileType === currentFileType)

    if (filteredData.length === 0) {
      // Destroy existing chart if it exists
      if (chartRefs['fileHeatmapChart']) {
        chartRefs['fileHeatmapChart'].destroy()
        chartRefs['fileHeatmapChart'] = null
      }

      container.innerHTML = `
        <div class="d-flex align-items-center justify-content-center h-100 text-muted" style="height: ${height}px;">
          <div class="text-center">
            <i class="bi bi-funnel fs-1 mb-3"></i>
            <p class="mb-0">No files with type "${currentFileType}" found</p>
          </div>
        </div>
      `
      return
    }
  }

  // Limit files and prepare data
  const limitedData = filteredData.slice(0, maxFiles)

  const data = limitedData.map(file => ({
    x: file.fileName,
    y: file.totalLines
  }))

  const options = {
    chart: {
      type: 'treemap',
      height: height,
      toolbar: { show: false },
      background: '#ffffff'
    },
    series: [{
      data: data
    }],
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
            color: '#9be9a8'
          }, {
            from: 51,
            to: 200,
            color: '#40c463'
          }, {
            from: 201,
            to: 500,
            color: '#30a14e'
          }, {
            from: 501,
            to: 99999,
            color: '#216e39'
          }]
        }
      }
    },
    tooltip: {
      theme: 'light',
      custom: function({dataPointIndex}: any) {
        const file = limitedData[dataPointIndex]
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
  }

  // Destroy existing chart if it exists
  if (chartRefs['fileHeatmapChart']) {
    chartRefs['fileHeatmapChart'].destroy()
    chartRefs['fileHeatmapChart'] = null
  }

  const chart = new (window as any).ApexCharts(container, options)
  chart.render()
  chartRefs['fileHeatmapChart'] = chart
}