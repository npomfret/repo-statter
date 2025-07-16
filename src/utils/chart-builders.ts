import type { DataPoint } from '../types/index.js'
import type { TimeSeriesPoint, LinearSeriesPoint } from '../chart/data-transformer.js'
import type { CommitData } from '../git/parser.js'

interface UserTimeSeriesResult {
  addedData: DataPoint[]
  removedData: DataPoint[]
  netData: DataPoint[]
}

export function buildTimeSeriesData(
  data: LinearSeriesPoint[],
  xAxis: 'date' | 'commit',
  yValueExtractor: (point: any) => number,
  filteredTimeSeries: TimeSeriesPoint[]
): DataPoint[] {
  if (xAxis === 'date') {
    return filteredTimeSeries.map(point => ({
      x: new Date(point.date).getTime(),
      y: yValueExtractor(point)
    }))
  } else {
    return data.map(point => ({
      x: point.commitIndex,
      y: yValueExtractor(point)
    }))
  }
}

export function buildUserTimeSeriesData(
  userCommits: CommitData[],
  xAxis: 'date' | 'commit',
  metric: 'lines' | 'bytes',
  filteredTimeSeries: TimeSeriesPoint[]
): UserTimeSeriesResult {
  const addedData: DataPoint[] = []
  const removedData: DataPoint[] = []
  const netData: DataPoint[] = []
  
  if (xAxis === 'date') {
    let cumulativeAdded = 0
    let cumulativeRemoved = 0
    let cumulativeBytesAdded = 0
    let cumulativeBytesRemoved = 0
    
    // Group user commits by date
    const userCommitsByDate: Record<string, CommitData[]> = {}
    userCommits.forEach(commit => {
      const dateKey = new Date(commit.date).toISOString().split('T')[0]
      if (!userCommitsByDate[dateKey]) {
        userCommitsByDate[dateKey] = []
      }
      userCommitsByDate[dateKey].push(commit)
    })
    
    // Use ONLY filteredTimeSeries dates to match other charts' x-axis
    const sortedDates = filteredTimeSeries.map(point => point.date)
    
    // Always start with zero at the first date
    if (sortedDates.length > 0) {
      const firstTimestamp = new Date(sortedDates[0]).getTime()
      addedData.push({ x: firstTimestamp, y: 0 })
      removedData.push({ x: firstTimestamp, y: 0 })
      netData.push({ x: firstTimestamp, y: 0 })
    }
    
    sortedDates.forEach(date => {
      const dateKey = date.split('T')[0]
      const dateContributions = userCommitsByDate[dateKey] || []
      
      const dayAdded = dateContributions.reduce((sum, c) => sum + c.linesAdded, 0)
      const dayRemoved = dateContributions.reduce((sum, c) => sum + c.linesDeleted, 0)
      const dayBytesAdded = dateContributions.reduce((sum, c) => sum + (c.bytesAdded || c.linesAdded * 50), 0)
      const dayBytesRemoved = dateContributions.reduce((sum, c) => sum + (c.bytesDeleted || c.linesDeleted * 50), 0)
      
      cumulativeAdded += dayAdded
      cumulativeRemoved += dayRemoved
      cumulativeBytesAdded += dayBytesAdded
      cumulativeBytesRemoved += dayBytesRemoved
      
      const timestamp = new Date(date).getTime()
      if (metric === 'lines') {
        addedData.push({ x: timestamp, y: cumulativeAdded })
        removedData.push({ x: timestamp, y: -cumulativeRemoved })
        netData.push({ x: timestamp, y: cumulativeAdded - cumulativeRemoved })
      } else {
        addedData.push({ x: timestamp, y: cumulativeBytesAdded })
        removedData.push({ x: timestamp, y: -cumulativeBytesRemoved })
        netData.push({ x: timestamp, y: cumulativeBytesAdded - cumulativeBytesRemoved })
      }
    })
  } else {
    // By commit view
    addedData.push({ x: 0, y: 0 })
    removedData.push({ x: 0, y: 0 })
    netData.push({ x: 0, y: 0 })
    
    let cumulativeAdded = 0
    let cumulativeRemoved = 0
    let cumulativeBytesAdded = 0
    let cumulativeBytesRemoved = 0
    
    userCommits.forEach((commit, i) => {
      const x = i + 1
      cumulativeAdded += commit.linesAdded
      cumulativeRemoved += commit.linesDeleted
      const bytesAdded = commit.bytesAdded || commit.linesAdded * 50
      const bytesRemoved = commit.bytesDeleted || commit.linesDeleted * 50
      cumulativeBytesAdded += bytesAdded
      cumulativeBytesRemoved += bytesRemoved
      
      if (metric === 'lines') {
        addedData.push({ x, y: cumulativeAdded })
        removedData.push({ x, y: -cumulativeRemoved })
        netData.push({ x, y: cumulativeAdded - cumulativeRemoved })
      } else {
        addedData.push({ x, y: cumulativeBytesAdded })
        removedData.push({ x, y: -cumulativeBytesRemoved })
        netData.push({ x, y: cumulativeBytesAdded - cumulativeBytesRemoved })
      }
    })
  }
  
  return { addedData, removedData, netData }
}