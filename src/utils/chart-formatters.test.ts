import { describe, it, expect } from 'vitest';
import { formatBytes, formatNumber, createYAxisFormatter, createTooltipFormatter } from './chart-formatters.js';

describe('formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 bytes');
    expect(formatBytes(100)).toBe('100 bytes');
    expect(formatBytes(999)).toBe('999 bytes');
  });

  it('should format kilobytes correctly', () => {
    expect(formatBytes(1000)).toBe('1.00 KB');
    expect(formatBytes(1500)).toBe('1.50 KB');
    expect(formatBytes(999999)).toBe('1000.00 KB');
  });

  it('should format megabytes correctly', () => {
    expect(formatBytes(1000000)).toBe('1.00 MB');
    expect(formatBytes(1500000)).toBe('1.50 MB');
    expect(formatBytes(999999999)).toBe('1000.00 MB');
  });

  it('should format gigabytes correctly', () => {
    expect(formatBytes(1000000000)).toBe('1.00 GB');
    expect(formatBytes(1500000000)).toBe('1.50 GB');
    expect(formatBytes(2750000000)).toBe('2.75 GB');
  });
});

describe('formatNumber', () => {
  it('should format positive numbers with locale formatting', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('should format negative numbers as positive with locale formatting', () => {
    expect(formatNumber(-100)).toBe('100');
    expect(formatNumber(-1000)).toBe('1,000');
    expect(formatNumber(-1000000)).toBe('1,000,000');
  });
});

describe('createYAxisFormatter', () => {
  it('should create formatter for bytes metric', () => {
    const formatter = createYAxisFormatter('bytes');
    expect(formatter(0)).toBe('0 bytes');
    expect(formatter(1000)).toBe('1.00 KB');
    expect(formatter(1000000)).toBe('1.00 MB');
    expect(formatter(-1000000)).toBe('1.00 MB'); // Absolute value
  });

  it('should create formatter for non-bytes metric', () => {
    const formatter = createYAxisFormatter('lines');
    expect(formatter(0)).toBe('0');
    expect(formatter(1000)).toBe('1,000');
    expect(formatter(1000000)).toBe('1,000,000');
    expect(formatter(-1000)).toBe('1,000'); // Absolute value
  });
});

describe('createTooltipFormatter', () => {
  it('should create formatter for bytes metric with sign preservation', () => {
    const formatter = createTooltipFormatter('bytes');
    expect(formatter(0)).toBe('0 bytes');
    expect(formatter(1000)).toBe('1.00 KB');
    expect(formatter(1000000)).toBe('1.00 MB');
    expect(formatter(-1000)).toBe('-1.00 KB');
    expect(formatter(-1000000)).toBe('-1.00 MB');
  });

  it('should create formatter for non-bytes metric with sign preservation', () => {
    const formatter = createTooltipFormatter('lines');
    expect(formatter(0)).toBe('0');
    expect(formatter(1000)).toBe('1,000');
    expect(formatter(1000000)).toBe('1,000,000');
    expect(formatter(-1000)).toBe('-1,000');
    expect(formatter(-1000000)).toBe('-1,000,000');
  });
});