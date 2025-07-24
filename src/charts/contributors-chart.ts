import type { ContributorStats } from '../data/contributor-calculator.js'
import { assert } from '../utils/errors.js'

export class ContributorsChart {
  private containerId: string
  private chart: any = null

  constructor(containerId: string) {
    this.containerId = containerId
  }

  render(contributors: ContributorStats[], topContributorsLimit: number = 10): void {
    assert(contributors !== undefined, 'Contributors data is required')
    assert(Array.isArray(contributors), 'Contributors must be an array')
    
    // Get container
    const container = document.querySelector('#' + this.containerId) as HTMLElement
    assert(container !== null, `Container with id ${this.containerId} not found`)
    
    
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
        background: '#ffffff'
      },
      series: [{ name: 'Commits', data: contributors.slice(0, topContributorsLimit).map(c => c.commits) }],
      xaxis: { 
        categories: contributors.slice(0, topContributorsLimit).map(c => c.name), 
        title: { 
          text: 'Contributors',
          style: { color: '#24292f' }
        },
        labels: { style: { colors: '#24292f' } }
      },
      yaxis: { 
        title: { 
          text: 'Commits',
          style: { color: '#24292f' }
        },
        labels: { style: { colors: '#24292f' } }
      },
      colors: ['#87bc45'],
      grid: { borderColor: '#e1e4e8' },
      tooltip: { theme: 'light' }
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