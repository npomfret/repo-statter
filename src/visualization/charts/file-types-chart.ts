import type { FileTypeStats } from '../../data/types.js'
import { chartRefs, chartData, getSelectedFileType, setFileTypeFilter, clearFileTypeFilter } from './chart-state.js'

export function renderFileTypesChart(fileTypes: FileTypeStats[]): void {
  const container = document.getElementById('fileTypesChart')
  if (!container) return

  const topFileTypes = fileTypes.slice(0, 10)

  // Store data for filtering
  chartData['fileTypesChart'] = { fileTypes: topFileTypes }

  const options = {
    chart: {
      type: 'donut',
      height: 350,
      background: '#ffffff',
      events: {
        dataPointSelection: function(_event: any, _chartContext: any, config: any) {
          const selectedType = config.w.config.labels[config.dataPointIndex]

          // Instead of using ApexCharts selection state, use our own selectedFileType
          if (getSelectedFileType() === selectedType) {
            clearFileTypeFilter()
          } else {
            setFileTypeFilter(selectedType)
          }
        }
      }
    },
    series: topFileTypes.map(ft => ft.lines),
    labels: topFileTypes.map(ft => ft.type),
    colors: ['#ea5545', '#f46a9b', '#ffd33d', '#b33dc6', '#27aeef', '#2ea043', '#0366d6', '#79c0ff', '#e27300', '#666666'],
    dataLabels: {
      enabled: true,
      formatter: function(val: number, opts: any) {
        const name = opts.w.globals.labels[opts.seriesIndex]
        return name + ': ' + val.toFixed(1) + '%'
      },
      style: {
        fontSize: '12px',
        fontFamily: 'inherit',
        fontWeight: '600',
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
  }

  const chart = new (window as any).ApexCharts(container, options)
  chart.render()
  chartRefs['fileTypesChart'] = chart
}