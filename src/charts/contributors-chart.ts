import type { ContributorStats } from '../data/contributor-calculator.js'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export class ContributorsChart {
  private containerId: string
  private chart: any = null

  constructor(containerId: string) {
    this.containerId = containerId
  }

  render(contributors: ContributorStats[]): void {
    assert(contributors !== undefined, 'Contributors data is required')
    assert(Array.isArray(contributors), 'Contributors must be an array')
    
    const container = document.querySelector('#' + this.containerId)
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark'
    
    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
    
    const options = {
      chart: { 
        type: 'bar', 
        height: 350, 
        toolbar: { show: false },
        background: isDark ? '#161b22' : '#ffffff'
      },
      series: [{ name: 'Commits', data: contributors.slice(0, 10).map(c => c.commits) }],
      xaxis: { 
        categories: contributors.slice(0, 10).map(c => c.name), 
        title: { 
          text: 'Contributors',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
      },
      yaxis: { 
        title: { 
          text: 'Commits',
          style: { color: isDark ? '#f0f6fc' : '#24292f' }
        },
        labels: { style: { colors: isDark ? '#f0f6fc' : '#24292f' } }
      },
      colors: [isDark ? '#3fb950' : '#87bc45'],
      grid: { borderColor: isDark ? '#30363d' : '#e1e4e8' },
      tooltip: { theme: isDark ? 'dark' : 'light' }
    }
    
    // ApexCharts will be available globally in the browser
    this.chart = new (window as any).ApexCharts(container, options)
    this.chart.render()
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy()
      this.chart = null
    }
  }
}