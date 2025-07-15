import { describe, it, expect } from 'vitest'
import { 
  parseCommitHistory, 
  generateReport, 
  getContributorStats, 
  getFileTypeStats, 
  getTimeSeriesData, 
  getLinearSeriesData, 
  processCommitMessages, 
  VERSION 
} from './index.js'

describe('Constants', () => {
  it('should export VERSION constant', () => {
    expect(VERSION).toBe('1.0.0')
  })
})

describe('Function exports', () => {
  it('should export parseCommitHistory as function', () => {
    expect(typeof parseCommitHistory).toBe('function')
  })
  
  it('should export generateReport as function', () => {
    expect(typeof generateReport).toBe('function')
  })
  
  it('should export getContributorStats as function', () => {
    expect(typeof getContributorStats).toBe('function')
  })
  
  it('should export getFileTypeStats as function', () => {
    expect(typeof getFileTypeStats).toBe('function')
  })
  
  it('should export getTimeSeriesData as function', () => {
    expect(typeof getTimeSeriesData).toBe('function')
  })
  
  it('should export getLinearSeriesData as function', () => {
    expect(typeof getLinearSeriesData).toBe('function')
  })
  
  it('should export processCommitMessages as function', () => {
    expect(typeof processCommitMessages).toBe('function')
  })
})