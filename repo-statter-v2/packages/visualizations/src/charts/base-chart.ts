// Base chart class that all charts extend
import type { ChartComponent, ChartOptions } from '../types/index.js'
import { getThemeColors } from '../utils/themes.js'

export abstract class BaseChart implements ChartComponent {
  protected container: HTMLElement | null = null
  protected options: ChartOptions
  protected chart: any // ApexCharts instance
  
  constructor(options: ChartOptions = {}) {
    this.options = {
      responsive: true,
      animations: true,
      theme: 'auto',
      height: 350,
      ...options
    }
  }
  
  abstract render(): HTMLElement
  abstract update(data: any): void
  
  destroy(): void {
    if (this.chart && typeof this.chart.destroy === 'function') {
      this.chart.destroy()
    }
    if (this.container) {
      this.container.innerHTML = ''
    }
  }
  
  resize(): void {
    if (this.chart && typeof this.chart.updateOptions === 'function') {
      this.chart.updateOptions({
        chart: {
          width: '100%'
        }
      })
    }
  }
  
  protected createContainer(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'chart-container'
    container.style.width = '100%'
    container.style.height = typeof this.options.height === 'number' 
      ? `${this.options.height}px` 
      : this.options.height || '350px'
    
    this.container = container
    return container
  }
  
  protected getBaseChartOptions() {
    const themeColors = getThemeColors(this.options.theme || 'auto')
    
    return {
      chart: {
        height: this.options.height,
        width: this.options.width || '100%',
        background: themeColors.background,
        foreColor: themeColors.text,
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        animations: {
          enabled: this.options.animations,
          speed: 750,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        }
      },
      grid: {
        borderColor: themeColors.grid,
        strokeDashArray: 0
      },
      tooltip: {
        theme: this.options.theme === 'dark' ? 'dark' : 'light',
        style: {
          fontSize: '12px'
        }
      },
      title: {
        text: this.options.title,
        align: 'left',
        style: {
          fontSize: '16px',
          fontWeight: 600,
          color: themeColors.text
        }
      },
      subtitle: {
        text: this.options.subtitle,
        align: 'left',
        style: {
          fontSize: '14px',
          fontWeight: 400,
          color: themeColors.text
        }
      }
    }
  }
}