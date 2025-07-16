import type { ChartOptions } from '../types/index.js'

export abstract class BaseChart {
  protected container: HTMLElement
  protected chart: ApexCharts | null = null
  protected isDark: boolean
  
  constructor(containerId: string) {
    const element = document.getElementById(containerId)
    if (!element) {
      throw new Error(`Chart container with id '${containerId}' not found`)
    }
    this.container = element
    this.isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark'
  }
  
  protected getBaseOptions(): Partial<ApexCharts.ApexOptions> {
    return {
      chart: {
        toolbar: { show: false },
        background: this.isDark ? '#161b22' : '#ffffff'
      },
      grid: {
        borderColor: this.isDark ? '#30363d' : '#e1e4e8'
      },
      tooltip: {
        theme: this.isDark ? 'dark' : 'light'
      }
    }
  }
  
  protected getAxisLabelStyle(): ApexCharts.ApexXAxis['labels'] {
    return {
      style: { 
        colors: this.isDark ? '#f0f6fc' : '#24292f' 
      }
    }
  }
  
  protected getTitleStyle(): ApexCharts.ApexTitleSubtitle {
    return {
      style: { 
        color: this.isDark ? '#f0f6fc' : '#24292f' 
      }
    }
  }
  
  public destroy(): void {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
    this.container.innerHTML = ''
  }
  
  public abstract render(data: any, options?: ChartOptions): void
  
  protected handleError(error: Error): void {
    console.error(`Chart error in ${this.constructor.name}:`, error)
    this.container.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <strong>Chart Error:</strong> ${error.message}
      </div>
    `
  }
}