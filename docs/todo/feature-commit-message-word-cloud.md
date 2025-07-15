Depends on: [phase-1-core-data-collection.md](phase-1-core-data-collection.md), [phase-2-html-report-scaffolding.md](phase-2-html-report-scaffolding.md)

# Feature: Commit Message Word Cloud

## 1. Goal

To generate a word cloud from all commit messages to visualize the most common terms and themes in the project's development history.

## 2. Implementation Plan

### Status: ✅ COMPLETE

### Analysis

Current state:
- Commit messages are already collected in the `CommitData` interface
- We have a modular structure with clear separation of concerns
- ApexCharts is used for all visualizations via CDN
- No existing D3.js dependency

### Technical Approach

#### 1. Word Cloud Library Choice
**Decision: Use d3-cloud**
- Smallest bundle size (36 kB)
- Excellent TypeScript support via @types/d3-cloud
- Most popular and well-maintained
- Can be styled to match ApexCharts visuals

#### 2. Text Processing Strategy
- Create a new module `src/text/processor.ts` for text analysis utilities
- Implement stop word filtering for common English words
- Add frequency counting with case normalization
- Filter out short words (< 3 characters) and numbers

#### 3. Integration Approach
Since we're using CDN for ApexCharts, we'll:
- Load d3-cloud from CDN as well for consistency
- Add the script tag in template.html
- Create inline JavaScript similar to existing chart implementations

### Implementation Steps

1. **Update template.html** (src/report/template.html)
   - Add d3-cloud CDN script tag after ApexCharts
   - Add a new card section for the word cloud visualization
   - Place it after the Code Churn chart for logical flow

2. **Create text processing utilities** (src/text/processor.ts)
   - `extractWords(messages: string[]): string[]` - tokenize and clean
   - `getWordFrequencies(words: string[]): Array<{text: string, size: number}>` - count frequencies
   - `filterStopWords(words: string[]): string[]` - remove common words
   - Export interface `WordFrequency { text: string; size: number }`

3. **Add word cloud data to report generator** (src/report/generator.ts)
   - Import text processor functions
   - Process commit messages to generate word frequencies
   - Pass word cloud data to template injection

4. **Implement word cloud rendering** (inline in template)
   - Add `renderWordCloud()` function in the script section
   - Style to match existing charts (colors, fonts, etc.)
   - Handle responsive sizing
   - Add hover tooltips showing word frequency

### Commit Strategy

This will be implemented in a single commit since it's a cohesive feature:
- "feat: Add commit message word cloud visualization"

### Technical Details

**Stop Words List:**
Common words to filter: the, is, are, was, were, been, be, have, has, had, do, does, did, will, would, should, could, may, might, must, can, a, an, and, or, but, in, on, at, to, for, of, with, by, from, up, about, into, through, during, before, after, above, below, between, under, since, without, within, along, following, across, behind, beyond, plus, except, but, yet, so, if, then, than, such, both, either, neither, all, each, every, any, some, no, not, only, just, also, very, too, quite, almost, always, often, never, seldom, rarely, usually, generally, sometimes, now, then, once, twice, first, second, last, next, this, that, these, those, it, its, our, their, there, here, when, where, why, how, what, which, who, whom, whose

**Word Cloud Configuration:**
```javascript
const layout = d3.layout.cloud()
  .size([width, height])
  .words(wordData)
  .padding(5)
  .rotate(() => ~~(Math.random() * 2) * 90)
  .font("'Inter', -apple-system, sans-serif")
  .fontSize(d => d.size)
  .on("end", draw);
```

### Success Criteria

1. Word cloud displays in the report showing commit message terms
2. Common words are filtered out
3. Visual style matches existing ApexCharts
4. Responsive design works on different screen sizes
5. No TypeScript errors
6. Performance is acceptable (< 100ms to render)

## 3. Files to Modify

*   `src/report/template.html`: Add d3-cloud CDN and word cloud container
*   `src/text/processor.ts`: NEW FILE - Text processing utilities
*   `src/report/generator.ts`: Process commit messages and pass to template
*   `src/index.ts`: Export new text processing functions (optional)