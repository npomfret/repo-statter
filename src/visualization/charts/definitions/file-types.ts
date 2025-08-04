import type { ApexOptions } from 'apexcharts'
import type { FileTypeStats } from '../../../data/types.js'
import type { ChartDefinition } from '../chart-definitions.js'
import { CHART_COLOR_PALETTES } from '../shared/colors.js'
import { createBaseChartOptions, createLegendOptions, createTooltipOptions } from '../shared/common-options.js'
import { validateArrayInput, validateFileType } from '../shared/validators.js'

export const fileTypesChart: ChartDefinition = {
  type: 'donut',
  hasAxisToggle: false,
  height: 350,
  elementId: 'fileTypesChart',
  dataFormatter: (fileTypes: FileTypeStats[]) => {
    const validatedFileTypes = validateArrayInput(fileTypes, 'fileTypes')
    const topFileTypes = validatedFileTypes.slice(0, 10)
    
    topFileTypes.forEach((ft, index) => validateFileType(ft, index))
    
    if (topFileTypes.length === 0) {
      throw new Error('fileTypes: No file type data available')
    }
    
    return {
      series: topFileTypes.map(ft => ft.lines),
      labels: topFileTypes.map(ft => ft.type),
      data: topFileTypes,
      segments: topFileTypes.map((ft, i) => ({
        label: ft.type,
        color: CHART_COLOR_PALETTES.pastel[i % 10]
      }))
    }
  },
  optionsBuilder: (data): ApexOptions => ({
    ...createBaseChartOptions('donut', 350),
    series: data.series,
    labels: data.labels,
    colors: CHART_COLOR_PALETTES.pastel,
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          labels: {
            show: false
          }
        }
      }
    },
    states: {
      active: {
        allowMultipleDataPointsSelection: false,
        filter: {
          type: 'none'
        }
      }
    },
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
      ...createLegendOptions('bottom'),
      onItemClick: {
        toggleDataSeries: false
      }
    },
    tooltip: {
      ...createTooltipOptions(),
      y: {
        formatter: function(val: number) {
          return val.toLocaleString() + ' lines'
        }
      }
    }
  }),
  mounted: (chartElement: HTMLElement, data: any) => {
    const fileTypeFilter = (window as any).fileTypeFilter
    if (data.segments && fileTypeFilter) {
      const waitForSvg = () => {
        const svg = chartElement.querySelector('svg')
        if (svg && svg.querySelectorAll('path[fill]:not([fill="none"])').length > 0) {
          fileTypeFilter.attachToChart(chartElement, data.segments)
        } else {
          setTimeout(waitForSvg, 50)
        }
      }
      waitForSvg()
    }
  }
}