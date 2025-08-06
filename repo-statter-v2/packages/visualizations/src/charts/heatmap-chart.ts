// Heatmap chart implementation
import { BaseChart } from './base-chart.js'
import type { ChartOptions } from '../types/index.js'

export class HeatmapChart extends BaseChart {
  private _data: Array<{ x: string; y: string; value: number }>
  
  constructor(options: ChartOptions & { data: Array<{ x: string; y: string; value: number }> }) {
    super(options)
    this._data = options.data || []
  }
  
  render(): HTMLElement {
    const container = this.createContainer()
    // Chart rendering will be implemented with ApexCharts
    return container
  }
  
  update(data: Array<{ x: string; y: string; value: number }>): void {
    this._data = data
    // Update chart implementation
  }
}