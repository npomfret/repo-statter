Depends on: [phase-3-visualization-and-interactivity.md](phase-3-visualization-and-interactivity.md)

# Feature: Interactive Filtering

## 1. Goal

To allow users to filter the entire report by a specific author, date range, or file type. This will enable more focused and personalized analysis.

## 2. Implementation Plan

### Status: 📋 READY TO IMPLEMENT

### Analysis Summary
✅ **Current Structure**: Reports have 47 commits from 1 author with 6 file types (JSON, TypeScript, Markdown, HTML, .svg, Other)
✅ **Data Available**: All commit data with author, date, and file changes is collected
✅ **Chart Infrastructure**: All charts are rendered inline with clear rendering functions
✅ **Template Structure**: Header area available for filter controls between title and stats cards

### Detailed Implementation Plan

#### 1. UI Design (template.html)

**Filter Controls Panel** (added after header, before stats cards):
```html
<div class="row mb-4">
    <div class="col-12">
        <div class="card">
            <div class="card-header">
                <h6 class="card-title mb-0">Filter Data</h6>
            </div>
            <div class="card-body">
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">Author</label>
                        <select class="form-select" id="authorFilter">
                            <option value="">All Authors</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Date Range</label>
                        <div class="input-group">
                            <input type="date" class="form-control" id="dateFromFilter">
                            <span class="input-group-text">to</span>
                            <input type="date" class="form-control" id="dateToFilter">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">File Type</label>
                        <select class="form-select" id="fileTypeFilter">
                            <option value="">All File Types</option>
                        </select>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <button class="btn btn-primary btn-sm" id="applyFilters">Apply Filters</button>
                        <button class="btn btn-outline-secondary btn-sm ms-2" id="clearFilters">Clear Filters</button>
                        <small class="text-muted ms-3" id="filterStatus">Showing all commits</small>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

#### 2. Data Filtering Logic (generator.ts)

**Add filtering functions to chart script**:
```javascript
let originalCommits = commits; // Store original data
let filteredCommits = commits; // Current filtered data

function applyFilters() {
    const authorFilter = document.getElementById('authorFilter').value;
    const dateFromFilter = document.getElementById('dateFromFilter').value;
    const dateToFilter = document.getElementById('dateToFilter').value;
    const fileTypeFilter = document.getElementById('fileTypeFilter').value;
    
    filteredCommits = originalCommits.filter(commit => {
        // Author filter
        if (authorFilter && commit.authorName !== authorFilter) return false;
        
        // Date range filter
        const commitDate = new Date(commit.date);
        if (dateFromFilter && commitDate < new Date(dateFromFilter)) return false;
        if (dateToFilter && commitDate > new Date(dateToFilter)) return false;
        
        // File type filter
        if (fileTypeFilter && !commit.filesChanged.some(f => f.fileType === fileTypeFilter)) return false;
        
        return true;
    });
    
    updateFilterStatus();
    reRenderAllCharts();
}

function updateFilterStatus() {
    const statusElement = document.getElementById('filterStatus');
    statusElement.textContent = `Showing ${filteredCommits.length} of ${originalCommits.length} commits`;
}
```

#### 3. Chart Re-rendering (generator.ts)

**Modify all chart rendering functions to use `filteredCommits`**:
- Update `renderCommitActivityChart()` to use filtered data
- Update `renderContributorsChart()` to use filtered data  
- Update `renderLinesOfCodeChart()` to use filtered data
- Update `renderFileTypesChart()` to use filtered data
- Update `renderCodeChurnChart()` to use filtered data
- Update `renderRepositorySizeChart()` to use filtered data
- Update `renderWordCloud()` to use filtered data
- Update `renderFileHeatmap()` to use filtered data

**Add re-rendering orchestration**:
```javascript
function reRenderAllCharts() {
    // Recalculate derived data with filtered commits
    const newContributors = getContributorStats(filteredCommits);
    const newFileTypes = getFileTypeStats(filteredCommits);
    const newTimeSeries = getTimeSeriesData(filteredCommits);
    const newLinearSeries = getLinearSeriesData(filteredCommits);
    const newWordCloudData = processCommitMessages(filteredCommits.map(c => c.message));
    const newFileHeatData = getFileHeatData(filteredCommits);
    
    // Clear existing charts
    clearAllCharts();
    
    // Re-render with new data
    renderAllChartsWithData(newContributors, newFileTypes, newTimeSeries, newLinearSeries, newWordCloudData, newFileHeatData);
}
```

#### 4. Dynamic Filter Population (generator.ts)

**Populate filter dropdowns on page load**:
```javascript
function populateFilters() {
    // Populate author filter
    const authors = [...new Set(originalCommits.map(c => c.authorName))].sort();
    const authorSelect = document.getElementById('authorFilter');
    authors.forEach(author => {
        const option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        authorSelect.appendChild(option);
    });
    
    // Populate file type filter
    const fileTypes = [...new Set(originalCommits.flatMap(c => c.filesChanged.map(f => f.fileType)))].sort();
    const fileTypeSelect = document.getElementById('fileTypeFilter');
    fileTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        fileTypeSelect.appendChild(option);
    });
    
    // Set default date range
    const dates = originalCommits.map(c => new Date(c.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    document.getElementById('dateFromFilter').value = minDate.toISOString().split('T')[0];
    document.getElementById('dateToFilter').value = maxDate.toISOString().split('T')[0];
}
```

#### 5. Breaking Into Steps

This can be implemented in a single focused commit:
- **"feat: Add interactive filtering controls for author, date range, and file type"**

**Implementation Order**:
1. Add filter controls to template.html
2. Add filtering logic and chart re-rendering functions
3. Update all chart rendering functions to use filtered data
4. Add event listeners and initialization code
5. Test with current repository data

### Technical Considerations

**Advantages**:
- All data is already available in the frontend
- Chart rendering functions are well-structured and modular
- Bootstrap provides consistent UI components
- Dark mode theming will work automatically

**Challenges**:
- Need to maintain two data sets (original and filtered)
- Chart re-rendering performance with complex charts
- Date range validation and edge cases
- Ensuring all derived data (timeSeries, contributors, etc.) is recalculated

### Files to Modify

*   `src/report/template.html`: Add filter controls panel
*   `src/report/generator.ts`: Add filtering logic and update chart rendering functions

### Testing Strategy

- Test with single-author repository (current state)
- Test date range filtering with different ranges
- Test file type filtering with different types
- Test filter combinations
- Test filter clearing functionality
- Verify all charts update correctly with filtered data
