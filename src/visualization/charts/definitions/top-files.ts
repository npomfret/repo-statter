import type { ApexOptions } from 'apexcharts'
import type { ChartDefinition } from '../chart-definitions.js'
import { CHART_COLORS } from '../shared/colors.js'
import { createBaseChartOptions, createAxisOptions, createTooltipOptions } from '../shared/common-options.js'

const createTopFilesChart = (
  elementId: string,
  dataKey: string,
  seriesName: string,
  xAxisTitle: string,
  tooltipSuffix: string
): ChartDefinition => ({
  type: 'bar',
  hasAxisToggle: false,
  height: 350,
  elementId,
  dataFormatter: (topFilesData: any) => {
    if (!topFilesData || !topFilesData[dataKey]) {
      console.warn(`${elementId}: No data provided`)
      return [{ data: [] }]
    }

    const files = topFilesData[dataKey].slice(0, 10)
    return [{
      name: seriesName,
      data: files.map((f: any) => ({
        x: f.fileName.split('/').pop() || f.fileName,
        y: f.value,
        fullPath: f.fileName
      }))
    }]
  },
  optionsBuilder: (series): ApexOptions => ({
    ...createBaseChartOptions('bar', 350),
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
    colors: [CHART_COLORS.primary],
    xaxis: {
      ...createAxisOptions(xAxisTitle),
      labels: {
        style: { colors: '#24292f' },
        formatter: (val: string | number) => Number(val).toLocaleString()
      }
    },
    yaxis: {
      labels: { show: false }
    },
    tooltip: {
      ...createTooltipOptions(),
      custom: function(opts: any) {
        const dataPoint = opts.w.config.series[0].data[opts.dataPointIndex]
        return `<div class="custom-tooltip">
          <div><strong>${dataPoint.fullPath}</strong></div>
          <div>${dataPoint.y.toLocaleString()} ${tooltipSuffix}</div>
        </div>`
      }
    }
  })
})

export const topFilesSizeChart = createTopFilesChart(
  'topFilesChartSize',
  'largest',
  'Lines of Code',
  'Lines of Code',
  'lines'
)

export const topFilesChurnChart = createTopFilesChart(
  'topFilesChartChurn',
  'mostChurn',
  'Number of Changes',
  'Number of Changes',
  'commits'
)

export const topFilesComplexChart = createTopFilesChart(
  'topFilesChartComplex',
  'mostComplex',
  'Cyclomatic Complexity',
  'Cyclomatic Complexity',
  'complexity'
)