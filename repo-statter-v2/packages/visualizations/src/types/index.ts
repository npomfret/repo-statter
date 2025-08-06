// Chart types and interfaces
import type { TimeSeriesPoint } from '@repo-statter/core'

export interface ChartOptions {
  title?: string
  subtitle?: string
  theme?: 'light' | 'dark' | 'auto'
  responsive?: boolean
  animations?: boolean
  height?: number | string
  width?: number | string
}

export interface ChartSeries {
  name: string
  data: TimeSeriesPoint[] | number[] | Array<{ x: string | number; y: number }>
  color?: string
  type?: 'line' | 'area' | 'bar' | 'scatter'
}

export interface ChartComponent {
  render(): HTMLElement
  update(data: any): void
  destroy(): void
  resize(): void
}

export interface ChartFactory {
  create(type: ChartType, options: ChartOptions): ChartComponent
  register(type: string, factory: () => ChartComponent): void
}

export type ChartType = 
  | 'growth-chart'
  | 'contributor-chart'
  | 'file-types-pie'
  | 'file-heatmap'
  | 'commit-activity'
  | 'word-cloud'
  | 'metric-card'

export interface VisualizationConfig {
  charts: {
    [key in ChartType]?: boolean
  }
  theme: 'light' | 'dark' | 'auto'
  animations: boolean
  responsive: boolean
}