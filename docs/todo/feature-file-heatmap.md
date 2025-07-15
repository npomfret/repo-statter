Depends on: [phase-1-core-data-collection.md](phase-1-core-data-collection.md), [phase-2-html-report-scaffolding.md](phase-2-html-report-scaffolding.md)

# Feature: File Heatmap

## 1. Goal

To create a visual tree map of the repository where files are colored based on their "heat" (i.e., how recently and frequently they have been changed). This will make it easy to see what parts of the codebase are most active.

## 2. Implementation Plan

### Status: 📋 READY TO IMPLEMENT

### Analysis Summary
✅ **Data Available**: File change data is already collected with `fileName`, `linesAdded`, `linesDeleted`, `fileType`  
✅ **Visualization Ready**: D3.js v3 is already loaded in template with treemap support  
✅ **Integration Clear**: Report structure and styling patterns are established  

### Detailed Implementation Plan

#### 1. Data Processing (src/stats/calculator.ts)

**Add `getFileHeatData()` function:**
- **Heat Score Calculation**: 
  - Frequency score: Number of commits that modified the file
  - Recency score: Weight recent changes higher (exponential decay)
  - Combined heat = `(frequency * 0.4) + (recency * 0.6)`
- **File Size Estimation**: Use `linesAdded` as proxy for treemap sizing
- **Data Structure**: 
```typescript
interface FileHeatData {
  fileName: string;
  heatScore: number;
  commitCount: number;
  lastModified: string;
  totalLines: number;
  fileType: string;
}
```

#### 2. Visualization Implementation (src/report/generator.ts)

**Add `renderFileHeatmap()` function:**
- Use D3.js `d3.layout.treemap()` for layout
- **Color Scale**: Hot files (red) → Warm files (yellow) → Cool files (blue)
- **Sizing**: Based on estimated file size (total lines)
- **Interactivity**: Tooltips showing file details on hover
- **Responsive**: Scale to container width

#### 3. Template Integration (src/report/template.html)

**Add new heatmap section:**
- New card container in existing grid layout
- Title: "File Activity Heatmap"
- SVG container for D3.js treemap
- Consistent styling with existing charts

#### 4. Technical Approach

**Heat Score Algorithm:**
```typescript
function calculateHeatScore(commits: CommitData[], fileName: string): number {
  const fileCommits = commits.filter(c => 
    c.filesChanged.some(f => f.fileName === fileName)
  );
  
  const frequency = fileCommits.length;
  const recency = Math.exp(-daysSinceLastModification / 30); // Decay over 30 days
  
  return (frequency * 0.4) + (recency * 0.6);
}
```

**D3.js Treemap Setup:**
```javascript
const treemap = d3.layout.treemap()
  .size([width, height])
  .value(d => d.totalLines)
  .round(true);
```

#### 5. Breaking Into Steps

This can be implemented in a single focused commit:
- **"feat: Add file activity heatmap visualization to reports"**

**Implementation Order:**
1. Add `getFileHeatData()` to stats calculator
2. Add `renderFileHeatmap()` to report generator  
3. Add heatmap container to template
4. Test with current repository data
5. Refine styling and interactivity

### Technical Considerations

**Advantages:**
- D3.js v3 already loaded with treemap support
- Rich file change data available
- Dark mode theming infrastructure exists
- Follows established patterns

**Potential Challenges:**
- Large repositories might need performance optimization
- Color scales need careful tuning for accessibility
- File path truncation for display

### Files to Modify

*   `src/stats/calculator.ts`: Add `getFileHeatData()` function
*   `src/report/generator.ts`: Add `renderFileHeatmap()` function and template integration
*   `src/report/template.html`: Add heatmap container section

### Testing Strategy

- Test with current repository (37 commits, diverse file types)
- Verify heat scores make intuitive sense
- Check responsive behavior and dark mode compatibility
- Validate tooltip interactivity
