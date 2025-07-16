import type { FilterState, FilteredData } from '../types/index.js'
import type { CommitData } from '../git/parser.js'
import type { ContributorStats, FileTypeStats } from '../stats/calculator.js'
import type { TimeSeriesPoint, LinearSeriesPoint } from '../chart/data-transformer.js'
import { DataRecalculator } from './data-recalculator.js'

export class FilterManager {
  private originalCommits: CommitData[]
  private filterState: FilterState = {
    author: '',
    dateFrom: '',
    dateTo: '',
    fileType: ''
  }
  
  constructor(commits: CommitData[]) {
    this.originalCommits = commits
  }
  
  public applyFilters(state: Partial<FilterState>): FilteredData {
    this.filterState = { ...this.filterState, ...state }
    
    const filteredCommits = this.originalCommits.filter(commit => {
      // Author filter
      if (this.filterState.author && commit.authorName !== this.filterState.author) {
        return false
      }
      
      // Date range filter
      const commitDate = new Date(commit.date)
      if (this.filterState.dateFrom && commitDate < new Date(this.filterState.dateFrom)) {
        return false
      }
      if (this.filterState.dateTo && commitDate > new Date(this.filterState.dateTo)) {
        return false
      }
      
      // File type filter
      if (this.filterState.fileType && !commit.filesChanged.some(f => f.fileType === this.filterState.fileType)) {
        return false
      }
      
      return true
    })
    
    return DataRecalculator.recalculateData(filteredCommits)
  }
  
  public clearFilters(): FilteredData {
    this.filterState = {
      author: '',
      dateFrom: '',
      dateTo: '',
      fileType: ''
    }
    return DataRecalculator.recalculateData(this.originalCommits)
  }
  
  public getFilterStatus(): string {
    const filtered = this.applyFilters(this.filterState)
    return `Showing ${filtered.commits.length} of ${this.originalCommits.length} commits`
  }
  
  public getAuthors(): string[] {
    return [...new Set(this.originalCommits.map(c => c.authorName))].sort()
  }
  
  public getFileTypes(): string[] {
    return [...new Set(this.originalCommits.flatMap(c => c.filesChanged.map(f => f.fileType)))].sort()
  }
  
  public getDateRange(): { minDate: Date, maxDate: Date } {
    const dates = this.originalCommits.map(c => new Date(c.date))
    return {
      minDate: new Date(Math.min(...dates.map(d => d.getTime()))),
      maxDate: new Date(Math.max(...dates.map(d => d.getTime())))
    }
  }
}