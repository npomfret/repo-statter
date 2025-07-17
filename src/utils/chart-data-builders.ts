export interface TimeSeriesPoint {
  date: string;
  commitIndex?: number;
  [key: string]: any;
}

export interface LinearSeriesPoint {
  commitIndex: number;
  sha?: string;
  [key: string]: any;
}

export interface Commit {
  sha: string;
  authorName: string;
  date: string;
  message: string;
  linesAdded: number;
  linesDeleted: number;
  bytesAdded?: number;
  bytesDeleted?: number;
}

export interface ChartDataPoint {
  x: number;
  y: number;
}

export type YValueExtractor = (point: TimeSeriesPoint | LinearSeriesPoint) => number;

export function buildTimeSeriesData(
  data: (TimeSeriesPoint | LinearSeriesPoint)[], 
  xAxis: string, 
  yValueExtractor: YValueExtractor,
  filteredTimeSeries?: TimeSeriesPoint[]
): ChartDataPoint[] {
  if (xAxis === 'date' && filteredTimeSeries) {
    return filteredTimeSeries.map(point => ({
      x: new Date(point.date).getTime(),
      y: yValueExtractor(point)
    }));
  } else {
    return data.map(point => ({
      x: point.commitIndex!,
      y: yValueExtractor(point)
    }));
  }
}

export interface UserTimeSeriesData {
  addedData: ChartDataPoint[];
  removedData: ChartDataPoint[];
  netData: ChartDataPoint[];
}

export function buildUserTimeSeriesData(
  userCommits: Commit[], 
  xAxis: string, 
  metric: 'lines' | 'bytes',
  filteredTimeSeries?: TimeSeriesPoint[]
): UserTimeSeriesData {
  const addedData: ChartDataPoint[] = [];
  const removedData: ChartDataPoint[] = [];
  const netData: ChartDataPoint[] = [];
  
  if (xAxis === 'date' && filteredTimeSeries) {
    let cumulativeAdded = 0;
    let cumulativeRemoved = 0;
    let cumulativeBytesAdded = 0;
    let cumulativeBytesRemoved = 0;
    
    // Group user commits by date (matching the format used in filteredTimeSeries)
    const userCommitsByDate: Record<string, Commit[]> = {};
    userCommits.forEach(commit => {
      // Use the same date key format as filteredTimeSeries (YYYY-MM-DD)
      const dateKey = new Date(commit.date).toISOString().split('T')[0]!;
      if (!userCommitsByDate[dateKey]) {
        userCommitsByDate[dateKey] = [];
      }
      userCommitsByDate[dateKey].push(commit);
    });
    
    // Use ONLY filteredTimeSeries dates to match other charts' x-axis
    const sortedDates = filteredTimeSeries.map(point => point.date);
    
    
    // Find the first date where this user has commits
    let firstUserCommitDate: string | null = null;
    for (const date of sortedDates) {
      const dateKey = date.split('T')[0]!;
      if (userCommitsByDate[dateKey] && userCommitsByDate[dateKey].length > 0) {
        firstUserCommitDate = date;
        break;
      }
    }
    
    // Add a zero point before the user's first commit
    if (firstUserCommitDate) {
      const firstCommitDate = new Date(firstUserCommitDate);
      const startDate = new Date(firstCommitDate);
      
      // Check if we're using hourly data (repo less than 2 days old)
      const firstDate = new Date(sortedDates[0]!);
      const lastDate = new Date(sortedDates[sortedDates.length - 1]!);
      const repoAgeHours = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60);
      const useHourlyData = repoAgeHours < 48;
      
      if (useHourlyData) {
        startDate.setHours(startDate.getHours() - 1); // One hour before
      } else {
        startDate.setDate(startDate.getDate() - 1); // One day before
      }
      
      const startTimestamp = startDate.getTime();
      addedData.push({ x: startTimestamp, y: 0 });
      removedData.push({ x: startTimestamp, y: 0 });
      netData.push({ x: startTimestamp, y: 0 });
    }
    
    sortedDates.forEach((date) => {
      // Skip dates before the user's first commit
      if (firstUserCommitDate && new Date(date) < new Date(firstUserCommitDate)) {
        return;
      }
      
      // Extract just the date part to match with userCommitsByDate
      const dateKey = date.split('T')[0]!;
      const dateContributions = userCommitsByDate[dateKey] ?? [];
      
      const dayAdded = dateContributions.reduce((sum: number, c: Commit) => sum + c.linesAdded, 0);
      const dayRemoved = dateContributions.reduce((sum: number, c: Commit) => sum + c.linesDeleted, 0);
      const dayBytesAdded = dateContributions.reduce((sum: number, c: Commit) => sum + (c.bytesAdded ?? c.linesAdded * 50), 0);
      const dayBytesRemoved = dateContributions.reduce((sum: number, c: Commit) => sum + (c.bytesDeleted ?? c.linesDeleted * 50), 0);
      
      cumulativeAdded += dayAdded;
      cumulativeRemoved += dayRemoved;
      cumulativeBytesAdded += dayBytesAdded;
      cumulativeBytesRemoved += dayBytesRemoved;
      
      // Add data point for this date
      const timestamp = new Date(date).getTime();
      if (metric === 'lines') {
        addedData.push({ x: timestamp, y: cumulativeAdded });
        removedData.push({ x: timestamp, y: -cumulativeRemoved });
        netData.push({ x: timestamp, y: cumulativeAdded - cumulativeRemoved });
      } else {
        addedData.push({ x: timestamp, y: cumulativeBytesAdded });
        removedData.push({ x: timestamp, y: -cumulativeBytesRemoved });
        netData.push({ x: timestamp, y: cumulativeBytesAdded - cumulativeBytesRemoved });
      }
    });
    
  } else {
    addedData.push({ x: 0, y: 0 });
    removedData.push({ x: 0, y: 0 });
    netData.push({ x: 0, y: 0 });
    
    let cumulativeAdded = 0;
    let cumulativeRemoved = 0;
    let cumulativeBytesAdded = 0;
    let cumulativeBytesRemoved = 0;
    
    userCommits.forEach((commit, i) => {
      const x = i + 1;
      cumulativeAdded += commit.linesAdded;
      cumulativeRemoved += commit.linesDeleted;
      const bytesAdded = commit.bytesAdded ?? commit.linesAdded * 50;
      const bytesRemoved = commit.bytesDeleted ?? commit.linesDeleted * 50;
      cumulativeBytesAdded += bytesAdded;
      cumulativeBytesRemoved += bytesRemoved;
      
      if (metric === 'lines') {
        addedData.push({ x, y: cumulativeAdded });
        removedData.push({ x, y: -cumulativeRemoved });
        netData.push({ x, y: cumulativeAdded - cumulativeRemoved });
      } else {
        addedData.push({ x, y: cumulativeBytesAdded });
        removedData.push({ x, y: -cumulativeBytesRemoved });
        netData.push({ x, y: cumulativeBytesAdded - cumulativeBytesRemoved });
      }
    });
  }
  
  return { addedData, removedData, netData };
}