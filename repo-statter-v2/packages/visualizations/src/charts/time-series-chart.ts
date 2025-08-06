// Time series chart implementation
import { BaseChart } from './base-chart.js'
import type { ChartOptions, ChartSeries } from '../types/index.js'

export class TimeSeriesChart extends BaseChart {
  private _data: ChartSeries[]
  
  constructor(options: ChartOptions & { series: ChartSeries[] }) {
    super(options)
    this._data = options.series || []
  }
  
  render(): HTMLElement {
    const container = this.createContainer()
    // Chart rendering will be implemented with ApexCharts
    return container
  }
  
  update(data: ChartSeries[]): void {
    this._data = data
    // Update chart implementation
  }
}