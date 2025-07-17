import { describe, it, expect } from 'vitest';
import { 
  truncateMessage, 
  createCommitTooltip, 
  createUserChartTooltip,
  type Commit,
  type LinearSeriesPoint 
} from './chart-tooltips.js';

describe('truncateMessage', () => {
  it('should return unchanged message if shorter than max length', () => {
    expect(truncateMessage('Short message', 20)).toBe('Short message');
  });

  it('should truncate and add ellipsis if longer than max length', () => {
    expect(truncateMessage('This is a very long message that needs truncation', 20)).toBe('This is a very long ...');
  });

  it('should handle exact length match', () => {
    expect(truncateMessage('Exactly twenty chars', 20)).toBe('Exactly twenty chars');
  });
});

describe('createCommitTooltip', () => {
  const mockCommits: Commit[] = [
    {
      sha: 'abc123456789',
      authorName: 'John Doe',
      date: '2023-06-15T10:30:00Z',
      message: 'Fix critical bug in authentication system',
      linesAdded: 150,
      linesDeleted: 50
    },
    {
      sha: 'def789012345',
      authorName: 'Jane Smith',
      date: '2023-06-16T14:20:00Z',
      message: 'Add new feature for user dashboard with real-time updates and notifications system that improves user experience significantly',
      linesAdded: 500,
      linesDeleted: 100
    }
  ];

  const mockLinearSeries: LinearSeriesPoint[] = [
    { commitIndex: 0, sha: 'start' },
    { commitIndex: 1, sha: 'abc123456789', cumulativeLines: 100 },
    { commitIndex: 2, sha: 'def789012345', cumulativeLines: 500 }
  ];

  it('should return null for non-commit x-axis', () => {
    const tooltipFn = createCommitTooltip('date', mockLinearSeries, mockCommits);
    expect(tooltipFn({ dataPointIndex: 1 })).toBeNull();
  });

  it('should return null for start point', () => {
    const tooltipFn = createCommitTooltip('commit', mockLinearSeries, mockCommits);
    expect(tooltipFn({ dataPointIndex: 0 })).toBeNull();
  });

  it('should return null for non-existent commit', () => {
    const tooltipFn = createCommitTooltip('commit', mockLinearSeries, mockCommits);
    expect(tooltipFn({ dataPointIndex: 5 })).toBeNull();
  });

  it('should generate tooltip for valid commit', () => {
    const tooltipFn = createCommitTooltip('commit', mockLinearSeries, mockCommits);
    const result = tooltipFn({ dataPointIndex: 1 });
    
    expect(result).toContain('<div class="custom-tooltip">');
    expect(result).toContain('<div class="tooltip-title">Commit #1</div>');
    expect(result).toContain('<strong>SHA:</strong> abc1234');
    expect(result).toContain('<strong>Author:</strong> John Doe');
    expect(result).toContain('<strong>Message:</strong> Fix critical bug in authentication system');
  });

  it('should truncate long commit messages', () => {
    const tooltipFn = createCommitTooltip('commit', mockLinearSeries, mockCommits);
    const result = tooltipFn({ dataPointIndex: 2 });
    
    expect(result).toContain('Add new feature for user dashboard with real-time updates and notifications system that improves user experience significantly');
    expect(result).not.toContain('...'); // Message exactly 200 chars after truncation
  });

  it('should include custom content when provided', () => {
    const customContent = (commit: Commit) => 
      `<div><strong>Net Lines:</strong> ${(commit.linesAdded - commit.linesDeleted).toLocaleString()}</div>`;
    
    const tooltipFn = createCommitTooltip('commit', mockLinearSeries, mockCommits, customContent);
    const result = tooltipFn({ dataPointIndex: 1 });
    
    expect(result).toContain('<strong>Net Lines:</strong> 100');
  });
});

describe('createUserChartTooltip', () => {
  const mockUserCommits: Commit[] = [
    {
      sha: 'abc123456789',
      authorName: 'John Doe',
      date: '2023-06-15T10:30:00Z',
      message: 'Fix critical bug',
      linesAdded: 150,
      linesDeleted: 50,
      bytesAdded: 7500,
      bytesDeleted: 2500
    },
    {
      sha: 'def789012345',
      authorName: 'John Doe',
      date: '2023-06-16T14:20:00Z',
      message: 'Add large feature implementation with extensive documentation',
      linesAdded: 5000,
      linesDeleted: 1000,
      bytesAdded: 250000000,
      bytesDeleted: 50000000
    }
  ];

  it('should return null for non-commit x-axis', () => {
    const tooltipFn = createUserChartTooltip('date', mockUserCommits, 'lines');
    expect(tooltipFn({ dataPointIndex: 1 })).toBeNull();
  });

  it('should return null for index 0', () => {
    const tooltipFn = createUserChartTooltip('commit', mockUserCommits, 'lines');
    expect(tooltipFn({ dataPointIndex: 0 })).toBeNull();
  });

  it('should return null for out of bounds index', () => {
    const tooltipFn = createUserChartTooltip('commit', mockUserCommits, 'lines');
    expect(tooltipFn({ dataPointIndex: 5 })).toBeNull();
  });

  it('should generate tooltip with lines metric', () => {
    const tooltipFn = createUserChartTooltip('commit', mockUserCommits, 'lines');
    const result = tooltipFn({ dataPointIndex: 1 });
    
    expect(result).toContain('<div class="custom-tooltip">');
    expect(result).toContain('<div class="tooltip-title">Commit #1</div>');
    expect(result).toContain('<strong>SHA:</strong> abc1234');
    expect(result).toContain('<strong>Lines Added:</strong> +150');
    expect(result).toContain('<strong>Lines Removed:</strong> -50');
  });

  it('should generate tooltip with bytes metric', () => {
    const tooltipFn = createUserChartTooltip('commit', mockUserCommits, 'bytes');
    const result = tooltipFn({ dataPointIndex: 1 });
    
    expect(result).toContain('<strong>Bytes Added:</strong> +7.50 KB');
    expect(result).toContain('<strong>Bytes Removed:</strong> -2.50 KB');
  });

  it('should format large byte values correctly', () => {
    const tooltipFn = createUserChartTooltip('commit', mockUserCommits, 'bytes');
    const result = tooltipFn({ dataPointIndex: 2 });
    
    expect(result).toContain('<strong>Bytes Added:</strong> +250.00 MB');
    expect(result).toContain('<strong>Bytes Removed:</strong> -50.00 MB');
  });

  it('should use estimated bytes when actual bytes not provided', () => {
    const commitsWithoutBytes: Commit[] = [{
      sha: 'xyz789',
      authorName: 'John Doe',
      date: '2023-06-17T10:00:00Z',
      message: 'Remove legacy code',
      linesAdded: 100,
      linesDeleted: 500
    }];
    
    const tooltipFn = createUserChartTooltip('commit', commitsWithoutBytes, 'bytes');
    const result = tooltipFn({ dataPointIndex: 1 });
    
    expect(result).toContain('<strong>Bytes Added:</strong> +5.00 KB'); // 100 * 50
    expect(result).toContain('<strong>Bytes Removed:</strong> -25.00 KB'); // 500 * 50
  });
});