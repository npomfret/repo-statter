import { describe, it, expect } from 'vitest';
import { 
  buildTimeSeriesData, 
  buildUserTimeSeriesData,
  type TimeSeriesPoint,
  type LinearSeriesPoint,
  type Commit
} from './chart-data-builders.js';

describe('buildTimeSeriesData', () => {
  const mockLinearSeries: LinearSeriesPoint[] = [
    { commitIndex: 0, sha: 'abc123', cumulativeLines: 100 },
    { commitIndex: 1, sha: 'def456', cumulativeLines: 250 },
    { commitIndex: 2, sha: 'ghi789', cumulativeLines: 400 }
  ];

  const mockTimeSeries: TimeSeriesPoint[] = [
    { date: '2023-06-02T00:00:00Z', cumulativeLines: 100, commitIndex: 0 },
    { date: '2023-06-03T00:00:00Z', cumulativeLines: 250, commitIndex: 1 },
    { date: '2023-06-04T00:00:00Z', cumulativeLines: 400, commitIndex: 2 }
  ];

  const simpleExtractor = (point: any) => point.cumulativeLines;

  it('should build data for commit x-axis', () => {
    const result = buildTimeSeriesData(mockLinearSeries, 'commit', simpleExtractor);
    
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ x: 0, y: 100 });
    expect(result[1]).toEqual({ x: 1, y: 250 });
    expect(result[2]).toEqual({ x: 2, y: 400 });
  });

  it('should build data for date x-axis', () => {
    const result = buildTimeSeriesData(mockLinearSeries, 'date', simpleExtractor, mockTimeSeries);
    
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ x: new Date('2023-06-02T00:00:00Z').getTime(), y: 100 });
    expect(result[1]).toEqual({ x: new Date('2023-06-03T00:00:00Z').getTime(), y: 250 });
    expect(result[2]).toEqual({ x: new Date('2023-06-04T00:00:00Z').getTime(), y: 400 });
  });

  it('should handle custom y-value extractors', () => {
    const doubleExtractor = (point: any) => point.cumulativeLines * 2;
    const result = buildTimeSeriesData(mockLinearSeries, 'commit', doubleExtractor);
    
    expect(result[0]).toEqual({ x: 0, y: 200 });
    expect(result[1]).toEqual({ x: 1, y: 500 });
    expect(result[2]).toEqual({ x: 2, y: 800 });
  });

  it('should handle negative values', () => {
    const negativeExtractor = (point: any) => -point.cumulativeLines;
    const result = buildTimeSeriesData(mockLinearSeries, 'commit', negativeExtractor);
    
    expect(result[0]).toEqual({ x: 0, y: -100 });
    expect(result[1]).toEqual({ x: 1, y: -250 });
    expect(result[2]).toEqual({ x: 2, y: -400 });
  });
});

describe('buildUserTimeSeriesData', () => {
  const mockUserCommits: Commit[] = [
    {
      sha: 'abc123',
      authorName: 'John Doe',
      date: '2023-06-02T10:00:00Z',
      message: 'Initial commit',
      linesAdded: 100,
      linesDeleted: 20,
      bytesAdded: 5000,
      bytesDeleted: 1000
    },
    {
      sha: 'def456',
      authorName: 'John Doe',
      date: '2023-06-03T14:00:00Z',
      message: 'Add feature',
      linesAdded: 200,
      linesDeleted: 50,
      bytesAdded: 10000,
      bytesDeleted: 2500
    },
    {
      sha: 'ghi789',
      authorName: 'John Doe',
      date: '2023-06-04T09:00:00Z',
      message: 'Fix bug',
      linesAdded: 50,
      linesDeleted: 100,
      bytesAdded: 2500,
      bytesDeleted: 5000
    }
  ];

  const mockTimeSeries: TimeSeriesPoint[] = [
    { date: '2023-06-01T00:00:00Z', cumulativeLines: 0, commitIndex: 0 },
    { date: '2023-06-02T00:00:00Z', cumulativeLines: 100, commitIndex: 1 },
    { date: '2023-06-03T00:00:00Z', cumulativeLines: 250, commitIndex: 2 },
    { date: '2023-06-04T00:00:00Z', cumulativeLines: 200, commitIndex: 3 },
    { date: '2023-06-05T00:00:00Z', cumulativeLines: 200, commitIndex: 3 }
  ];

  describe('commit x-axis', () => {
    it('should build cumulative data for lines metric', () => {
      const result = buildUserTimeSeriesData(mockUserCommits, 'commit', 'lines');
      
      expect(result.addedData).toHaveLength(3);
      expect(result.removedData).toHaveLength(3);
      expect(result.netData).toHaveLength(3);
      
      // Check cumulative values
      expect(result.addedData[0]).toEqual({ x: 0, y: 100 });
      expect(result.removedData[0]).toEqual({ x: 0, y: -20 });
      expect(result.netData[0]).toEqual({ x: 0, y: 80 });
      
      expect(result.addedData[1]).toEqual({ x: 1, y: 300 });
      expect(result.removedData[1]).toEqual({ x: 1, y: -70 });
      expect(result.netData[1]).toEqual({ x: 1, y: 230 });
      
      expect(result.addedData[2]).toEqual({ x: 2, y: 350 });
      expect(result.removedData[2]).toEqual({ x: 2, y: -170 });
      expect(result.netData[2]).toEqual({ x: 2, y: 180 });
    });

    it('should build cumulative data for bytes metric', () => {
      const result = buildUserTimeSeriesData(mockUserCommits, 'commit', 'bytes');
      
      expect(result.addedData).toHaveLength(3);
      
      expect(result.addedData[0]).toEqual({ x: 0, y: 5000 });
      expect(result.addedData[1]).toEqual({ x: 1, y: 15000 });
      expect(result.addedData[2]).toEqual({ x: 2, y: 17500 });
      
      expect(result.removedData[0]).toEqual({ x: 0, y: -1000 });
      expect(result.removedData[1]).toEqual({ x: 1, y: -3500 });
      expect(result.removedData[2]).toEqual({ x: 2, y: -8500 });
    });

    it('should estimate bytes when not provided', () => {
      const commitsWithoutBytes: Commit[] = [{
        sha: 'test123',
        authorName: 'John Doe',
        date: '2023-06-02T10:00:00Z',
        message: 'Test',
        linesAdded: 100,
        linesDeleted: 20
      }];
      
      const result = buildUserTimeSeriesData(commitsWithoutBytes, 'commit', 'bytes');
      
      expect(result.addedData[0]).toEqual({ x: 0, y: 5000 }); // 100 * 50
      expect(result.removedData[0]).toEqual({ x: 0, y: -1000 }); // 20 * 50
    });
  });

  describe('date x-axis', () => {
    it('should build cumulative data for lines metric with date grouping', () => {
      const result = buildUserTimeSeriesData(mockUserCommits, 'date', 'lines', mockTimeSeries);
      
      // Should have zero point before first commit + data points for dates with commits
      expect(result.addedData.length).toBeGreaterThan(0);
      
      // First point should be zero before user's first commit
      const firstPoint = result.addedData[0];
      expect(firstPoint!.y).toBe(0);
      
      // Check that cumulative values increase correctly
      const lastPoint = result.addedData[result.addedData.length - 1];
      expect(lastPoint!.y).toBe(350); // Total lines added
    });

    it('should skip dates before user first commit', () => {
      const result = buildUserTimeSeriesData(mockUserCommits, 'date', 'lines', mockTimeSeries);
      
      // The first point should be a zero point one day before June 2nd (user's first commit)
      // So we shouldn't have data for the actual June 1st from the time series
      const june1Timestamp = new Date('2023-06-01T00:00:00Z').getTime();
      const june1Point = result.addedData.find(point => point.x === june1Timestamp);
      
      // If June 1st exists, it should be the zero point we added
      if (june1Point) {
        expect(june1Point.y).toBe(0);
      }
      
      // The real data should start from June 2nd
      const june2Timestamp = new Date('2023-06-02T00:00:00Z').getTime();
      const june2Point = result.addedData.find(point => point.x === june2Timestamp);
      expect(june2Point).toBeDefined();
      expect(june2Point!.y).toBeGreaterThan(0);
    });

    it('should handle multiple commits on same date', () => {
      const sameDataCommits: Commit[] = [
        {
          sha: 'abc123',
          authorName: 'John Doe',
          date: '2023-06-02T10:00:00Z',
          message: 'Commit 1',
          linesAdded: 100,
          linesDeleted: 20
        },
        {
          sha: 'def456',
          authorName: 'John Doe',
          date: '2023-06-02T14:00:00Z',
          message: 'Commit 2',
          linesAdded: 50,
          linesDeleted: 10
        }
      ];
      
      const result = buildUserTimeSeriesData(sameDataCommits, 'date', 'lines', mockTimeSeries);
      
      // Find the point for June 2nd
      const june2Timestamp = new Date('2023-06-02T00:00:00Z').getTime();
      const june2Point = result.addedData.find(point => point.x === june2Timestamp);
      
      expect(june2Point).toBeDefined();
      expect(june2Point!.y).toBe(150); // 100 + 50
    });

    it('should handle hourly data for young repos', () => {
      const hourlyTimeSeries: TimeSeriesPoint[] = [
        { date: '2023-06-01T10:00:00Z', cumulativeLines: 0, commitIndex: 0 },
        { date: '2023-06-01T11:00:00Z', cumulativeLines: 100, commitIndex: 1 },
        { date: '2023-06-01T12:00:00Z', cumulativeLines: 150, commitIndex: 2 }
      ];
      
      const hourlyCommits: Commit[] = [{
        sha: 'abc123',
        authorName: 'John Doe',
        date: '2023-06-01T11:30:00Z',
        message: 'Commit',
        linesAdded: 100,
        linesDeleted: 20
      }];
      
      const result = buildUserTimeSeriesData(hourlyCommits, 'date', 'lines', hourlyTimeSeries);
      
      // Should have a zero point and data points
      expect(result.addedData.length).toBeGreaterThan(1);
      
      // The first point should be a zero point
      const firstPoint = result.addedData[0];
      expect(firstPoint!.y).toBe(0);
      
      // The zero point should be before the first data point with actual values
      const dataPoints = result.addedData.filter(p => p.y > 0);
      expect(dataPoints.length).toBeGreaterThan(0);
      expect(firstPoint!.x).toBeLessThan(dataPoints[0]!.x);
    });
  });

  it('should handle empty commits array', () => {
    const result = buildUserTimeSeriesData([], 'commit', 'lines');
    
    expect(result.addedData).toHaveLength(0);
    expect(result.removedData).toHaveLength(0);
    expect(result.netData).toHaveLength(0);
  });
});