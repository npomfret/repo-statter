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
      case 'contributor-bar':
        return this.getContributorBarData()
      case 'file-activity-heatmap':
        return this.getFileActivityHeatmapData()
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

  private static getContributorBarData() {
    const contributors = [
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        commits: 342,
        linesAdded: 8745,
        linesDeleted: 2134,
        filesChanged: 156,
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face'
      },
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        commits: 287,
        linesAdded: 6834,
        linesDeleted: 1923,
        filesChanged: 134,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face'
      },
      {
        name: 'Carol Davis',
        email: 'carol@example.com',
        commits: 198,
        linesAdded: 4567,
        linesDeleted: 1245,
        filesChanged: 89,
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face'
      },
      {
        name: 'David Wilson',
        email: 'david@example.com',
        commits: 156,
        linesAdded: 3892,
        linesDeleted: 987,
        filesChanged: 67,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face'
      },
      {
        name: 'Eve Martinez',
        email: 'eve@example.com',
        commits: 124,
        linesAdded: 2945,
        linesDeleted: 723,
        filesChanged: 45,
        avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=64&h=64&fit=crop&crop=face'
      },
      {
        name: 'Frank Chen',
        email: 'frank@example.com',
        commits: 89,
        linesAdded: 2134,
        linesDeleted: 567,
        filesChanged: 34,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face'
      }
    ]

    return {
      contributors,
      metrics: [
        { key: 'commits', label: 'Commits', color: '#008FFB' },
        { key: 'linesAdded', label: 'Lines Added', color: '#00E396' },
        { key: 'linesDeleted', label: 'Lines Deleted', color: '#FF4560' },
        { key: 'filesChanged', label: 'Files Changed', color: '#FEB019' }
      ]
    }
  }

  private static getFileActivityHeatmapData() {
    const languages = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'CSS', 'HTML', 'Markdown']
    const contributors = ['alice', 'bob', 'carol', 'david', 'eve', 'frank']
    
    const files = [
      {
        path: 'src/components/Dashboard.tsx',
        size: 15420,
        commits: 45,
        lastModified: new Date('2023-12-29'),
        contributors: ['alice', 'bob', 'carol'],
        language: 'TypeScript',
        complexity: 78,
        changeFrequency: 8.2
      },
      {
        path: 'src/utils/dataProcessing.ts',
        size: 12890,
        commits: 38,
        lastModified: new Date('2023-12-27'),
        contributors: ['alice', 'david'],
        language: 'TypeScript',
        complexity: 92,
        changeFrequency: 7.1
      },
      {
        path: 'src/api/client.js',
        size: 8934,
        commits: 32,
        lastModified: new Date('2023-12-25'),
        contributors: ['bob', 'eve'],
        language: 'JavaScript',
        complexity: 65,
        changeFrequency: 6.8
      },
      {
        path: 'src/services/auth.ts',
        size: 7654,
        commits: 28,
        lastModified: new Date('2023-12-22'),
        contributors: ['carol', 'frank'],
        language: 'TypeScript',
        complexity: 54,
        changeFrequency: 5.9
      },
      {
        path: 'src/components/Chart.tsx',
        size: 6543,
        commits: 25,
        lastModified: new Date('2023-12-20'),
        contributors: ['alice', 'bob'],
        language: 'TypeScript',
        complexity: 43,
        changeFrequency: 4.7
      },
      {
        path: 'server/main.py',
        size: 5432,
        commits: 22,
        lastModified: new Date('2023-12-18'),
        contributors: ['david', 'eve'],
        language: 'Python',
        complexity: 67,
        changeFrequency: 4.2
      },
      {
        path: 'src/styles/global.css',
        size: 4321,
        commits: 19,
        lastModified: new Date('2023-12-15'),
        contributors: ['carol'],
        language: 'CSS',
        complexity: 12,
        changeFrequency: 3.8
      },
      {
        path: 'README.md',
        size: 3210,
        commits: 18,
        lastModified: new Date('2023-12-12'),
        contributors: ['alice', 'bob', 'carol', 'david'],
        language: 'Markdown',
        complexity: 5,
        changeFrequency: 3.2
      },
      {
        path: 'package.json',
        size: 2987,
        commits: 35,
        lastModified: new Date('2023-12-28'),
        contributors: ['alice', 'bob', 'david', 'eve'],
        language: 'JSON',
        complexity: 8,
        changeFrequency: 9.1
      },
      {
        path: 'src/config/database.ts',
        size: 2543,
        commits: 15,
        lastModified: new Date('2023-12-10'),
        contributors: ['david', 'frank'],
        language: 'TypeScript',
        complexity: 34,
        changeFrequency: 2.8
      }
    ]

    // Generate additional files for better heatmap visualization
    for (let i = 0; i < 40; i++) {
      const paths = this.generateFilePaths(1)
      const randomContributors = contributors
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 3) + 1)
      
      files.push({
        path: paths[0],
        size: Math.floor(Math.random() * 10000) + 500,
        commits: Math.floor(Math.random() * 40) + 1,
        lastModified: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
        contributors: randomContributors,
        language: languages[Math.floor(Math.random() * languages.length)],
        complexity: Math.floor(Math.random() * 100) + 1,
        changeFrequency: Math.random() * 10
      })
    }

    return {
      files,
      colorMetric: 'commits' as const
    }
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