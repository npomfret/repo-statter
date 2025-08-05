# Architecture Documentation

## Project Overview

This is a project which analyzes git repos and the commit history. It provides a bunch of visual tools for slicing and dicing the data, all presented in a single HTML file.

## Desired Architecture

### Commit Replay System
The system uses the git CLI/API to go back in time (either the start of the repo or by default 1000 commits) and then replays each commit one by one. This process is slow and commits are cached in the user's tmp folder to improve performance.

We have a set of configurable file filters which exclude certain things (like `docs` folders) that are applied at the replay stage that affect EVERYTHING from here. As each commit is played, we analyse it for things like the commit message, the line numbers changing, the bytes changed, etc.

### Dual-Track Analysis
After the initial analysis, the replay ends with a state that represents the HEAD of the project. From here we build two types of analysis:

1. **Time-Series Analysis** - A set of time-series charts to show how things evolve
2. **Current State Analysis** - A set of tools for looking at the current state of the project and drilling down to see where problems might occur

### Processing Pipeline

1. **Initialization Phase**
   - Parse CLI arguments
   - Load configuration
   - Validate git repository
   - Initialize cache system

2. **Data Extraction Phase (Commit Replay)**
   - Check cache for existing processed commits
   - Determine commit range (repo start or last N commits, default 1000)
   - **Commit-by-Commit Replay**: Chronologically traverse and replay each commit
   - **Per-Commit Analysis**: Extract commit message, line changes, byte changes, file modifications
   - **File Filtering**: Apply configurable exclusion rules (e.g., `docs/`, `node_modules/`) during replay
   - **Critical Performance Note**: This is the slowest phase, heavily relies on caching
   - Store processed commit data in user's tmp folder cache

3. **Data Transformation Phase**
   - Transform commits into linear format
   - Generate time series data
   - Calculate contributor statistics
   - Compute file analytics

4. **Analysis Phase (Dual-Track Analysis)**
   After replay completes, the system has a complete state representing HEAD of the project.
   Two parallel analysis tracks are executed:
   
   **Track 1: Time-Series Analysis**
   - Generate historical evolution charts
   - Show how metrics change over time
   - Commit activity patterns, growth trends, contributor evolution
   - Time-based visualizations for understanding project evolution
   
   **Track 2: Current State Analysis**
   - Analyze final state of the project at HEAD
   - Identify current hotspots and problem areas
   - File heat maps, complexity analysis, contributor focus areas
   - Drill-down tools for investigating current issues

5. **Rendering Phase**
   - Generate interactive charts
   - Render HTML template
   - Embed all assets
   - Output self-contained report

### Caching Strategy

**Critical for Performance**: The commit replay process is inherently slow because it processes each commit individually through the Git CLI/API. Caching is essential for practical usage.

**Cache Location**: User's tmp folder (system temporary directory)
**Cache Granularity**: Per-commit processed data
**Cache Key**: Repository path + git state hash

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Cache Check     │───▶│ Incremental     │───▶│ Full Replay     │
│ (tmp folder)    │    │ Replay          │    │ Process         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Use Cached Data │    │ Replay New      │    │ Replay All      │
│ (Fast)          │    │ Commits Only    │    │ Commits (Slow)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ HEAD State +    │    │ HEAD State +    │    │ HEAD State +    │
│ Dual Analysis   │    │ Dual Analysis   │    │ Dual Analysis   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**File Filtering Impact**: Filters are applied during the replay stage, meaning cached data already reflects the filtering rules. Changing filters requires cache invalidation and full replay.

**Analysis Output**: Regardless of cache path, the final result is a HEAD state that enables both time-series analysis and current state analysis.

## Output Features

Based on examination of the generated HTML report, here are the sections categorized by our two analysis tracks:

### Time-Series Analysis Features (Historical Evolution)
- **Growth Over Time**: Cumulative growth charts with date/commit toggle
- **Lines of Code by Category**: Stacked area chart showing file type evolution
- **Commit Activity Over Time**: Daily commit frequency patterns
- **Per-User Activity Charts**: Individual contributor activity over time
- **Time Range Filtering**: Interactive slider to filter all time-series charts

### Current State Analysis Features (Present-Moment Investigation)
- **Key Repository Metrics**: Current totals (commits, lines of code, contributors, active days)
- **File Types Distribution**: Current language composition pie chart
- **Top Files Analysis**: Largest/Most Churn/Most Complex tabbed rankings
- **File Activity Heatmap**: Interactive treemap of current file sizes and activity
- **Top Contributors**: Current contribution volume rankings
- **Award System**: Recognition across 7 categories (Most Files Modified, Most Bytes Added/Removed, Most Lines Added/Removed, Lowest/Highest Average Lines Changed)
- **Commit Message Word Cloud**: Text analysis of commit patterns