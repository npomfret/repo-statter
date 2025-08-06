/**
 * Sample data generator for playground testing
 */
export class SampleData {
  /**
   * Get sample data for a specific component type
   */
  static getForComponent(componentType: string): any {
    switch (componentType) {
      case 'growth-chart':
        return this.getGrowthChartData()
      case 'file-types-pie':
        return this.getFileTypesPieData()
      case 'top-files-table':
        return this.getTopFilesTableData()
      case 'time-range-slider':
        return this.getTimeRangeSliderData()
      case 'metric-card':
        return this.getMetricCardData()
      case 'chart-toggle':
        return this.getChartToggleData()
      default:
        return null
    }
  }

  private static getGrowthChartData() {
    const startDate = new Date('2023-01-01')
    const endDate = new Date('2024-12-31')
    const points = 24 // 24 months
    
    const commits = this.generateTimeSeries(startDate, endDate, points, 50, 800)
    const linesOfCode = this.generateTimeSeries(startDate, endDate, points, 1000, 50000, true)
    const contributors = this.generateTimeSeries(startDate, endDate, points, 5, 25)

    return {
      series: [
        {
          name: 'Commits',
          data: commits,
          color: '#0066cc'
        },
        {
          name: 'Lines of Code',
          data: linesOfCode.map(point => ({ ...point, y: Math.floor(point.y / 100) })), // Scale down for better comparison
          color: '#28a745'
        },
        {
          name: 'Contributors',
          data: contributors,
          color: '#ffc107'
        }
      ],
      metadata: {
        title: 'Repository Growth Over Time',
        description: 'Sample data showing repository metrics growth'
      }
    }
  }

  private static getFileTypesPieData() {
    return {
      series: [45, 25, 15, 8, 4, 3],
      labels: ['TypeScript', 'JavaScript', 'CSS/SCSS', 'HTML', 'JSON', 'Markdown'],
      colors: ['#3178c6', '#f7df1e', '#1572b6', '#e34f26', '#292929', '#083fa1'],
      metadata: {
        total: 15420,
        title: 'Lines of Code by File Type'
      }
    }
  }

  private static getTopFilesTableData() {
    return {
      tabs: [
        {
          id: 'largest',
          label: 'Largest Files',
          files: [
            {
              path: 'src/components/DataVisualization/ComplexChart.tsx',
              metric: 2840,
              secondaryMetric: Date.now() - 86400000 * 5,
              contributors: ['alice', 'bob', 'charlie']
            },
            {
              path: 'src/utils/dataProcessing/aggregators.ts',
              metric: 1950,
              secondaryMetric: Date.now() - 86400000 * 2,
              contributors: ['alice', 'david']
            },
            {
              path: 'src/services/api/repositoryService.ts',
              metric: 1720,
              secondaryMetric: Date.now() - 86400000 * 12,
              contributors: ['bob', 'eve', 'frank']
            },
            {
              path: 'src/components/FileExplorer/TreeView.vue',
              metric: 1580,
              secondaryMetric: Date.now() - 86400000 * 7,
              contributors: ['charlie', 'alice']
            },
            {
              path: 'backend/controllers/analysisController.py',
              metric: 1420,
              secondaryMetric: Date.now() - 86400000 * 3,
              contributors: ['david', 'eve']
            },
            {
              path: 'src/lib/parsing/gitLogParser.rs',
              metric: 1350,
              secondaryMetric: Date.now() - 86400000 * 15,
              contributors: ['frank']
            },
            {
              path: 'docs/api/endpoints.md',
              metric: 1280,
              secondaryMetric: Date.now() - 86400000 * 30,
              contributors: ['alice', 'bob', 'charlie', 'david']
            },
            {
              path: 'src/components/Charts/TimeSeriesChart.jsx',
              metric: 1150,
              secondaryMetric: Date.now() - 86400000 * 1,
              contributors: ['eve', 'alice']
            }
          ]
        },
        {
          id: 'churn',
          label: 'Most Changed',
          files: [
            {
              path: 'src/config/environment.ts',
              metric: 127,
              secondaryMetric: 8,
              contributors: ['alice', 'bob', 'charlie', 'david', 'eve', 'frank', 'grace', 'henry']
            },
            {
              path: 'package.json',
              metric: 89,
              secondaryMetric: 12,
              contributors: ['alice', 'bob', 'charlie', 'david']
            },
            {
              path: 'src/components/App.tsx',
              metric: 76,
              secondaryMetric: 6,
              contributors: ['alice', 'bob', 'eve', 'frank', 'grace', 'henry']
            },
            {
              path: 'src/utils/helpers.ts',
              metric: 64,
              secondaryMetric: 9,
              contributors: ['charlie', 'david', 'eve']
            },
            {
              path: 'README.md',
              metric: 52,
              secondaryMetric: 7,
              contributors: ['alice', 'bob', 'charlie', 'david', 'eve', 'frank', 'grace']
            }
          ]
        },
        {
          id: 'complex',
          label: 'Most Complex',
          files: [
            {
              path: 'src/algorithms/diffAlgorithm.ts',
              metric: 24.7,
              secondaryMetric: 890,
              contributors: ['alice', 'david']
            },
            {
              path: 'src/parsers/gitLogParser.ts',
              metric: 19.3,
              secondaryMetric: 1420,
              contributors: ['bob', 'charlie']
            },
            {
              path: 'src/components/DataGrid/VirtualizedTable.tsx',
              metric: 16.8,
              secondaryMetric: 1150,
              contributors: ['eve', 'frank']
            },
            {
              path: 'src/services/analysisEngine.ts',
              metric: 14.2,
              secondaryMetric: 780,
              contributors: ['alice', 'grace']
            },
            {
              path: 'src/utils/treeTraversal.ts',
              metric: 12.9,
              secondaryMetric: 650,
              contributors: ['david', 'henry']
            }
          ]
        },
        {
          id: 'hotspots',
          label: 'Hotspots',
          files: [
            {
              path: 'src/components/App.tsx',
              metric: 92.4,
              secondaryMetric: 45,
              contributors: ['alice', 'bob', 'eve']
            },
            {
              path: 'src/services/api.ts',
              metric: 87.1,
              secondaryMetric: 38,
              contributors: ['charlie', 'david']
            },
            {
              path: 'src/utils/formatters.ts',
              metric: 79.8,
              secondaryMetric: 32,
              contributors: ['eve', 'frank', 'grace']
            },
            {
              path: 'src/config/routes.ts',
              metric: 71.2,
              secondaryMetric: 28,
              contributors: ['alice', 'henry']
            },
            {
              path: 'src/components/Navigation.tsx',
              metric: 68.5,
              secondaryMetric: 25,
              contributors: ['bob', 'charlie', 'grace']
            }
          ]
        }
      ]
    }
  }

  private static getTimeRangeSliderData() {
    const now = new Date()
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    return {
      min: oneYearAgo,
      max: now,
      current: {
        start: threeMonthsAgo,
        end: now
      }
    }
  }

  private static getMetricCardData() {
    return [
      {
        label: 'Total Commits',
        value: 2847,
        icon: 'commits',
        trend: {
          value: 12.5,
          direction: 'up' as const
        },
        description: 'Commits in the last 30 days'
      },
      {
        label: 'Active Contributors',
        value: 12,
        icon: 'users',
        trend: {
          value: 8.3,
          direction: 'down' as const
        },
        description: 'Contributors in the last month'
      },
      {
        label: 'Lines of Code',
        value: 47832,
        icon: 'code',
        trend: {
          value: 23.7,
          direction: 'up' as const
        },
        description: 'Total lines across all files'
      },
      {
        label: 'Files Changed',
        value: 156,
        icon: 'files',
        trend: {
          value: 5.2,
          direction: 'up' as const
        },
        description: 'Files modified this week'
      }
    ]
  }

  private static getChartToggleData() {
    return {
      options: [
        {
          value: 'by-date',
          label: 'By Date',
          icon: '📅'
        },
        {
          value: 'by-commit',
          label: 'By Commit',
          icon: '🔀'
        },
        {
          value: 'by-author',
          label: 'By Author',
          icon: '👤'
        }
      ],
      defaultValue: 'by-date'
    }
  }

  /**
   * Generate time series data for charts
   */
  private static generateTimeSeries(
    startDate: Date,
    endDate: Date,
    points: number,
    minValue: number,
    maxValue: number,
    trending: boolean = false
  ): Array<{ x: number; y: number }> {
    const data: Array<{ x: number; y: number }> = []
    const timeStep = (endDate.getTime() - startDate.getTime()) / (points - 1)
    
    let currentValue = minValue + Math.random() * (maxValue - minValue) * 0.3
    
    for (let i = 0; i < points; i++) {
      const x = startDate.getTime() + i * timeStep
      
      // Add some randomness and trend
      const randomFactor = (Math.random() - 0.5) * 0.2
      const trendFactor = trending ? (i / points) * 0.5 : 0
      
      currentValue = Math.max(
        minValue,
        Math.min(
          maxValue,
          currentValue * (1 + randomFactor + trendFactor)
        )
      )
      
      data.push({
        x: Math.floor(x),
        y: Math.floor(currentValue)
      })
    }
    
    return data
  }

  /**
   * Generate random file paths for testing
   */
  private static generateFilePaths(count: number): string[] {
    const prefixes = ['src', 'lib', 'components', 'utils', 'services', 'tests']
    const directories = ['api', 'ui', 'data', 'auth', 'config', 'helpers', 'parsers']
    const filenames = ['index', 'utils', 'service', 'component', 'parser', 'handler']
    const extensions = ['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java']
    
    const paths: string[] = []
    
    for (let i = 0; i < count; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
      const directory = directories[Math.floor(Math.random() * directories.length)]
      const filename = filenames[Math.floor(Math.random() * filenames.length)]
      const extension = extensions[Math.floor(Math.random() * extensions.length)]
      
      paths.push(`${prefix}/${directory}/${filename}.${extension}`)
    }
    
    return paths
  }
}