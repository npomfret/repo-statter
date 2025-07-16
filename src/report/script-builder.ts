import type { CommitData } from '../git/parser.js'
import type { ContributorStats, FileTypeStats, FileHeatData } from '../stats/calculator.js'
import type { TimeSeriesPoint, LinearSeriesPoint } from '../chart/data-transformer.js'
import type { WordCloudData, Awards, ChartData } from '../types/index.js'

interface ScriptData {
  commits: CommitData[]
  contributors: ContributorStats[]
  fileTypes: FileTypeStats[]
  timeSeries: TimeSeriesPoint[]
  linearSeries: LinearSeriesPoint[]
  wordCloudData: WordCloudData[]
  fileHeatData: FileHeatData[]
  awards: Awards
  trophySvgs: ChartData['trophySvgs']
}

export class ScriptBuilder {
  public static buildScript(data: ScriptData): string {
    // For now, we're still embedding the full script as a string
    // In a future iteration, this could be replaced with a bundled client-side module
    return `
    <script>
      // Data initialization
      const commits = ${JSON.stringify(data.commits)};
      const contributors = ${JSON.stringify(data.contributors)};
      const fileTypes = ${JSON.stringify(data.fileTypes)};
      const timeSeries = ${JSON.stringify(data.timeSeries)};
      const linearSeries = ${JSON.stringify(data.linearSeries)};
      const wordCloudData = ${JSON.stringify(data.wordCloudData)};
      const fileHeatData = ${JSON.stringify(data.fileHeatData)};
      const awards = ${JSON.stringify(data.awards)};
      const trophySvgs = ${JSON.stringify(data.trophySvgs)};
      
      // Initialize the client-side application
      // This will be replaced with a proper module system in the future
      ${this.getClientScript()}
    </script>
    `
  }
  
  private static getClientScript(): string {
    // For now, return a minimal initialization script
    // In the future, this would import the bundled client modules
    return `
      document.addEventListener('DOMContentLoaded', function() {
        console.log('Repository statistics loaded');
        console.log('Total commits:', commits.length);
        
        // TODO: Initialize the client-side application
        // This will be replaced with proper module imports and initialization
        // For now, the existing inline script continues to work
      });
    `
  }
  
  public static validateData(data: ScriptData): string[] {
    const errors: string[] = []
    
    if (!data.commits || !Array.isArray(data.commits)) {
      errors.push('Invalid commits data')
    }
    
    if (!data.contributors || !Array.isArray(data.contributors)) {
      errors.push('Invalid contributors data')
    }
    
    if (!data.fileTypes || !Array.isArray(data.fileTypes)) {
      errors.push('Invalid file types data')
    }
    
    if (!data.timeSeries || !Array.isArray(data.timeSeries)) {
      errors.push('Invalid time series data')
    }
    
    if (!data.linearSeries || !Array.isArray(data.linearSeries)) {
      errors.push('Invalid linear series data')
    }
    
    if (!data.wordCloudData || !Array.isArray(data.wordCloudData)) {
      errors.push('Invalid word cloud data')
    }
    
    if (!data.fileHeatData || !Array.isArray(data.fileHeatData)) {
      errors.push('Invalid file heat data')
    }
    
    if (!data.awards || typeof data.awards !== 'object') {
      errors.push('Invalid awards data')
    }
    
    return errors
  }
}