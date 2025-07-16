import ApexCharts from 'apexcharts'
import { BaseChart } from './base-chart.js'
import type { ContributorStats } from '../stats/calculator.js'

export class ContributorsChart extends BaseChart {
  public render(contributors: ContributorStats[]): void {
    try {
      this.destroy()
      
      const options: ApexCharts.ApexOptions = {
        ...this.getBaseOptions(),
        chart: {
          ...this.getBaseOptions().chart,
          type: 'bar',
          height: 350
        },
        series: [{
          name: 'Commits',
          data: contributors.slice(0, 10).map(c => c.commits)
        }],
        xaxis: {
          categories: contributors.slice(0, 10).map(c => c.name),
          title: {
            text: 'Contributors',
            ...this.getTitleStyle()
          },
          labels: this.getAxisLabelStyle() as any
        },
        yaxis: {
          title: {
            text: 'Commits',
            ...this.getTitleStyle()
          },
          labels: this.getAxisLabelStyle() as any
        },
        colors: [this.isDark ? '#3fb950' : '#87bc45']
      }
      
      this.chart = new ApexCharts(this.container, options)
      this.chart.render()
    } catch (error) {
      this.handleError(error as Error)
    }
  }
}