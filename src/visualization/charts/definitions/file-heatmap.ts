import type { ApexOptions } from 'apexcharts'
import type { FileHeatData } from '../../../data/types.js'
import type { ChartDefinition } from '../chart-definitions.js'
import { createBaseChartOptions, createTooltipOptions } from '../shared/common-options.js'
import { validateArrayInput, validateFile } from '../shared/validators.js'

export const fileHeatmapChart: ChartDefinition = {
  type: 'treemap',
  hasAxisToggle: false,
  height: 400,
  elementId: 'fileHeatmapChart',
  dataFormatter: (fileHeatData: FileHeatData[], options?: { maxFiles?: number, manager?: any }) => {
    const validatedData = validateArrayInput(fileHeatData, 'fileHeatmap')
    const maxFiles = options?.maxFiles ?? 100
    
    let filteredData = validatedData
    const currentFileType = options?.manager?.getFileTypeFilter?.()
    if (currentFileType) {
      filteredData = validatedData.filter(file => file.fileType === currentFileType)
    }
    
    const limitedData = filteredData.slice(0, maxFiles)
    
    limitedData.forEach((file, index) => {
      validateFile(file, index, 'fileHeatmap')
      if (typeof file.totalLines !== 'number' || file.totalLines < 0) {
        throw new Error(`fileHeatmap: File '${file.fileName}' has invalid totalLines: ${file.totalLines}`)
      }
    })
    
    return [{
      data: limitedData.map(file => ({
        x: file.fileName,
        y: file.totalLines,
        meta: file
      }))
    }]
  },
  optionsBuilder: (series, options): ApexOptions => ({
    ...createBaseChartOptions('treemap', options?.height ?? 400),
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
      ...createTooltipOptions(),
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
}