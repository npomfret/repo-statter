import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  recalculateData,
  populateAuthorFilter,
  populateFileTypeFilter,
  getDateRange,
  clearFilters,
  getFilterStatus,
  type Commit,
  type FilterState
} from './filter-system.js';

describe('applyFilters', () => {
  const mockCommits: Commit[] = [
    {
      sha: 'abc123',
      authorName: 'John Doe',
      date: '2023-06-01T10:00:00Z',
      message: 'Initial commit',
      linesAdded: 100,
      linesDeleted: 0,
      filesChanged: [
        { fileName: 'index.js', fileType: 'JavaScript', linesAdded: 50, linesDeleted: 0 },
        { fileName: 'style.css', fileType: 'CSS', linesAdded: 50, linesDeleted: 0 }
      ]
    },
    {
      sha: 'def456',
      authorName: 'Jane Smith',
      date: '2023-06-02T14:00:00Z',
      message: 'Add feature',
      linesAdded: 200,
      linesDeleted: 50,
      filesChanged: [
        { fileName: 'feature.js', fileType: 'JavaScript', linesAdded: 200, linesDeleted: 50 }
      ]
    },
    {
      sha: 'ghi789',
      authorName: 'John Doe',
      date: '2023-06-03T09:00:00Z',
      message: 'Fix bug',
      linesAdded: 50,
      linesDeleted: 100,
      filesChanged: [
        { fileName: 'index.js', fileType: 'JavaScript', linesAdded: 50, linesDeleted: 100 }
      ]
    }
  ];

  it('should return all commits when no filters applied', () => {
    const filters: FilterState = {
      authorFilter: '',
      dateFromFilter: '',
      dateToFilter: '',
      fileTypeFilter: ''
    };
    
    const result = applyFilters(mockCommits, filters);
    expect(result).toHaveLength(3);
    expect(result).toEqual(mockCommits);
  });

  it('should filter by author', () => {
    const filters: FilterState = {
      authorFilter: 'John Doe',
      dateFromFilter: '',
      dateToFilter: '',
      fileTypeFilter: ''
    };
    
    const result = applyFilters(mockCommits, filters);
    expect(result).toHaveLength(2);
    expect(result.every(c => c.authorName === 'John Doe')).toBe(true);
  });

  it('should filter by date range', () => {
    const filters: FilterState = {
      authorFilter: '',
      dateFromFilter: '2023-06-02T00:00:00.000Z',
      dateToFilter: '2023-06-02T23:59:59.999Z',
      fileTypeFilter: ''
    };
    
    const result = applyFilters(mockCommits, filters);
    expect(result).toHaveLength(1);
    expect(result[0]!.sha).toBe('def456');
  });

  it('should filter by file type', () => {
    const filters: FilterState = {
      authorFilter: '',
      dateFromFilter: '',
      dateToFilter: '',
      fileTypeFilter: 'CSS'
    };
    
    const result = applyFilters(mockCommits, filters);
    expect(result).toHaveLength(1);
    expect(result[0]!.sha).toBe('abc123');
  });

  it('should apply multiple filters', () => {
    const filters: FilterState = {
      authorFilter: 'John Doe',
      dateFromFilter: '2023-06-01T00:00:00.000Z',
      dateToFilter: '2023-06-01T23:59:59.999Z',
      fileTypeFilter: 'JavaScript'
    };
    
    const result = applyFilters(mockCommits, filters);
    expect(result).toHaveLength(1);
    expect(result[0]!.sha).toBe('abc123');
  });
});

describe('recalculateData', () => {
  const mockCommits: Commit[] = [
    {
      sha: 'abc123',
      authorName: 'John Doe',
      date: '2023-06-01T10:00:00Z',
      message: 'Initial commit with important feature',
      linesAdded: 100,
      linesDeleted: 0,
      filesChanged: [
        { fileName: 'index.js', fileType: 'JavaScript', linesAdded: 60, linesDeleted: 0 },
        { fileName: 'style.css', fileType: 'CSS', linesAdded: 40, linesDeleted: 0 }
      ],
      estimatedBytes: 5000
    },
    {
      sha: 'def456',
      authorName: 'Jane Smith',
      date: '2023-06-01T14:00:00Z',
      message: 'Add test files',
      linesAdded: 200,
      linesDeleted: 50,
      filesChanged: [
        { fileName: 'test.js', fileType: 'JavaScript', linesAdded: 200, linesDeleted: 50 }
      ]
    },
    {
      sha: 'ghi789',
      authorName: 'John Doe',
      date: '2023-06-02T09:00:00Z',
      message: 'Fix critical bug',
      linesAdded: 50,
      linesDeleted: 100,
      filesChanged: [
        { fileName: 'index.js', fileType: 'JavaScript', linesAdded: 50, linesDeleted: 100 }
      ]
    }
  ];

  it('should recalculate contributors correctly', () => {
    const result = recalculateData(mockCommits);
    
    expect(result.contributors).toHaveLength(2);
    expect(result.contributors[0]).toEqual({
      name: 'John Doe',
      commits: 2,
      linesAdded: 150,
      linesDeleted: 100
    });
    expect(result.contributors[1]).toEqual({
      name: 'Jane Smith',
      commits: 1,
      linesAdded: 200,
      linesDeleted: 50
    });
  });

  it('should recalculate file types correctly', () => {
    const result = recalculateData(mockCommits);
    
    expect(result.fileTypes).toHaveLength(2);
    expect(result.fileTypes[0]).toEqual({
      type: 'JavaScript',
      lines: 310,
      percentage: (310 / 350) * 100
    });
    expect(result.fileTypes[1]).toEqual({
      type: 'CSS',
      lines: 40,
      percentage: (40 / 350) * 100
    });
  });

  it('should recalculate time series correctly', () => {
    const result = recalculateData(mockCommits);
    
    expect(result.timeSeries).toHaveLength(2);
    expect(result.timeSeries[0]).toMatchObject({
      date: '2023-06-01',
      commits: 2,
      linesAdded: 300,
      linesDeleted: 50,
      cumulativeLines: 300,
      commitIndex: 0
    });
    expect(result.timeSeries[1]).toMatchObject({
      date: '2023-06-02',
      commits: 1,
      linesAdded: 50,
      linesDeleted: 100,
      cumulativeLines: 350,
      commitIndex: 1
    });
  });

  it('should recalculate linear series correctly', () => {
    const result = recalculateData(mockCommits);
    
    expect(result.linearSeries).toHaveLength(3);
    expect(result.linearSeries[0]).toEqual({
      commitIndex: 1,
      cumulativeLines: 100,
      cumulativeBytes: 5000
    });
    expect(result.linearSeries[1]).toEqual({
      commitIndex: 2,
      cumulativeLines: 300,
      cumulativeBytes: 15000 // 5000 + (200 * 50)
    });
    expect(result.linearSeries[2]).toEqual({
      commitIndex: 3,
      cumulativeLines: 350,
      cumulativeBytes: 17500 // 15000 + (50 * 50)
    });
  });

  it('should recalculate word cloud data correctly', () => {
    const result = recalculateData(mockCommits);
    
    const wordMap = new Map(result.wordCloudData.map(w => [w.text, w.weight]));
    expect(wordMap.get('commit')).toBe(1); // Only appears once in "Initial commit"
    expect(wordMap.get('feature')).toBe(1);
    expect(wordMap.get('bug')).toBe(1);
    expect(wordMap.get('test')).toBe(1);
    expect(wordMap.get('critical')).toBe(1);
    expect(wordMap.get('important')).toBe(1);
    expect(wordMap.get('initial')).toBe(1);
    expect(wordMap.get('fix')).toBe(1);
    expect(wordMap.get('add')).toBe(1);
    expect(wordMap.get('files')).toBe(1);
    
    // Common words should be filtered out
    expect(wordMap.has('the')).toBe(false);
    expect(wordMap.has('and')).toBe(false);
    expect(wordMap.has('with')).toBe(false);
  });

  it('should recalculate file heat data correctly', () => {
    const result = recalculateData(mockCommits);
    
    const fileMap = new Map(result.fileHeatData.map(f => [f.fileName, f]));
    
    const indexFile = fileMap.get('index.js');
    expect(indexFile).toBeDefined();
    expect(indexFile!.commitCount).toBe(2);
    expect(indexFile!.totalLines).toBe(10); // 60 + 50 - 100
    expect(indexFile!.fileType).toBe('JavaScript');
    expect(indexFile!.averageChurn).toBe(5); // 10 / 2
    
    const styleFile = fileMap.get('style.css');
    expect(styleFile).toBeDefined();
    expect(styleFile!.commitCount).toBe(1);
    expect(styleFile!.totalLines).toBe(40);
    
    const testFile = fileMap.get('test.js');
    expect(testFile).toBeDefined();
    expect(testFile!.commitCount).toBe(1);
    expect(testFile!.totalLines).toBe(150); // 200 - 50
  });

  it('should handle empty commits array', () => {
    const result = recalculateData([]);
    
    expect(result.contributors).toHaveLength(0);
    expect(result.fileTypes).toHaveLength(0);
    expect(result.timeSeries).toHaveLength(0);
    expect(result.linearSeries).toHaveLength(0);
    expect(result.wordCloudData).toHaveLength(0);
    expect(result.fileHeatData).toHaveLength(0);
  });
});

describe('populateAuthorFilter', () => {
  it('should return unique sorted authors', () => {
    const commits: Commit[] = [
      { authorName: 'Zoe', sha: '1', date: '', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] },
      { authorName: 'Alice', sha: '2', date: '', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] },
      { authorName: 'Bob', sha: '3', date: '', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] },
      { authorName: 'Alice', sha: '4', date: '', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] }
    ];
    
    const result = populateAuthorFilter(commits);
    expect(result).toEqual(['Alice', 'Bob', 'Zoe']);
  });

  it('should handle empty commits', () => {
    const result = populateAuthorFilter([]);
    expect(result).toEqual([]);
  });
});

describe('populateFileTypeFilter', () => {
  it('should return unique sorted file types', () => {
    const commits: Commit[] = [
      {
        sha: '1',
        authorName: '',
        date: '',
        message: '',
        linesAdded: 0,
        linesDeleted: 0,
        filesChanged: [
          { fileName: 'a.js', fileType: 'JavaScript', linesAdded: 0, linesDeleted: 0 },
          { fileName: 'b.css', fileType: 'CSS', linesAdded: 0, linesDeleted: 0 }
        ]
      },
      {
        sha: '2',
        authorName: '',
        date: '',
        message: '',
        linesAdded: 0,
        linesDeleted: 0,
        filesChanged: [
          { fileName: 'c.js', fileType: 'JavaScript', linesAdded: 0, linesDeleted: 0 },
          { fileName: 'd.py', fileType: 'Python', linesAdded: 0, linesDeleted: 0 }
        ]
      }
    ];
    
    const result = populateFileTypeFilter(commits);
    expect(result).toEqual(['CSS', 'JavaScript', 'Python']);
  });
});

describe('getDateRange', () => {
  it('should return correct min and max dates', () => {
    const commits: Commit[] = [
      { sha: '1', authorName: '', date: '2023-06-05T10:00:00Z', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] },
      { sha: '2', authorName: '', date: '2023-06-01T10:00:00Z', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] },
      { sha: '3', authorName: '', date: '2023-06-10T10:00:00Z', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] }
    ];
    
    const result = getDateRange(commits);
    expect(result.minDate).toEqual(new Date('2023-06-01T10:00:00Z'));
    expect(result.maxDate).toEqual(new Date('2023-06-10T10:00:00Z'));
  });
});

describe('clearFilters', () => {
  it('should return empty filter state', () => {
    const result = clearFilters();
    expect(result).toEqual({
      authorFilter: '',
      dateFromFilter: '',
      dateToFilter: '',
      fileTypeFilter: ''
    });
  });
});

describe('getFilterStatus', () => {
  it('should return correct status message', () => {
    const filtered: Commit[] = [
      { sha: '1', authorName: '', date: '', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] },
      { sha: '2', authorName: '', date: '', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] }
    ];
    const original: Commit[] = [
      ...filtered,
      { sha: '3', authorName: '', date: '', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] },
      { sha: '4', authorName: '', date: '', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] },
      { sha: '5', authorName: '', date: '', message: '', linesAdded: 0, linesDeleted: 0, filesChanged: [] }
    ];
    
    const result = getFilterStatus(filtered, original);
    expect(result).toBe('Showing 2 of 5 commits');
  });
});