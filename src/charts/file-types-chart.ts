import { BaseChart } from './base-chart.js'
import type { FileTypeStats } from '../stats/calculator.js'

export class FileTypesChart extends BaseChart {
  public render(fileTypes: FileTypeStats[]): void {
    try {
      this.destroy()
      
      const options: ApexCharts.ApexOptions = {
        ...this.getBaseOptions(),
        chart: {
          ...this.getBaseOptions().chart,
          type: 'donut',
          height: 350
        },
        series: fileTypes.slice(0, 8).map(ft => ft.lines),
        labels: fileTypes.slice(0, 8).map(ft => ft.type),
        colors: this.isDark ? 
          ['#58a6ff', '#3fb950', '#f85149', '#d29922', '#a5a5ff', '#56d4dd', '#db6d28', '#8b949e'] :
          ['#27aeef', '#87bc45', '#ea5545', '#ef9b20', '#b33dc6', '#f46a9b', '#ede15b', '#bdcf32'],
        legend: {
          labels: {
            colors: this.isDark ? '#f0f6fc' : '#24292f'
          }
        }
      }
      
      this.chart = new ApexCharts(this.container, options)
      this.chart.render()
    } catch (error) {
      this.handleError(error as Error)
    }
  }
}