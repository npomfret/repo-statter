# Repo Statter

[![npm version](https://badge.fury.io/js/repo-statter.svg)](https://www.npmjs.com/package/repo-statter)

Repo Statter is a Git repository analysis tool designed to generate insightful, interactive HTML reports. It provides detailed statistics about your codebase, helping you understand its evolution and characteristics.

**Note:** This tool is currently designed for small to medium-sized projects and may not scale efficiently for very large repositories (yet).

## Installation

### Install from npm

```bash
npm install -g repo-statter
```

### Install from source

Alternatively, you can clone the repository and run it directly:

### Prerequisites

- Node.js (version 18 or higher)
- Git
- Lizard (for code complexity analysis): `pip install lizard`

### Setup (from source)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/nickpomfret/repo-statter.git
    cd repo-statter
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Generating Reports

You can generate reports in two modes:

#### To run analysis

This generates both an interactive HTML report and a raw JSON data file with detailed statistics. The output will be placed in an `analysis/` directory, structured by repository name.

```bash
# If installed globally
repo-statter /path/to/your/repo

# If running from source
npm run analyse -- --repo /path/to/your/repo
```

Output:
- `analysis/<repository-name>/report.html` - Interactive HTML report
- `analysis/<repository-name>/repo-stats.json` - Raw statistics data

### CLI Reference

The `repo-statter` command line interface supports the following options:

```bash
repo-statter [repo-path] [options]
```

#### Arguments

- `[repo-path]` - Repository path to analyze (defaults to current directory)

#### Options

- `-r, --repo <path>` - Repository path (alternative to positional argument)
- `-o, --output <dir>` - Output directory for the report (default: `"dist"`)
- `--output-file <filename>` - Custom output filename (overrides default naming)
- `--max-commits <number>` - Maximum number of recent commits to analyze
- `--no-cache` - Disable caching (always do full scan)
- `--clear-cache` - Clear existing cache before running
- `--config-file <path>` - Path to custom configuration file
- `--export-config <path>` - Export default configuration to specified file
- `--force` - Force overwrite existing files when exporting configuration
- `-h, --help` - Display help information
- `-V, --version` - Display version number

#### Examples

```bash
# If installed globally:

# Analyze current directory with default settings
repo-statter

# Analyze specific repository
repo-statter /path/to/repo

# Analyze with custom output directory
repo-statter . --output reports

# Analyze with custom filename
repo-statter . --output-file my-project-report

# Analyze only the last 500 commits
repo-statter . --max-commits 500

# Force full scan (disable cache)
repo-statter . --no-cache

# Clear cache and regenerate
repo-statter . --clear-cache

# Export default configuration for editing
repo-statter --export-config my-config.json

# Use custom configuration file
repo-statter --config-file my-config.json

# Force overwrite existing config file
repo-statter --export-config my-config.json --force

# Combine options
repo-statter --repo /path/to/repo --output custom-dir --max-commits 2000

# If running from source, prefix with npm run analyse --
```

#### Notes

- The `--max-commits` option analyzes the most recent N commits, which can significantly improve performance for large repositories
- The `--output-file` option allows you to specify a custom filename, automatically adding `.html` extension if not provided
- When using npm scripts, remember to use `--` before passing options to separate npm arguments from script arguments
- Output paths are relative to the current working directory
- Use `--export-config` to create a configuration file you can edit, then `--config-file` to use it
- The exported configuration file contains all available settings with their default values

### Configuration Files

Repo Statter supports custom configuration files for easy customization of analysis settings:

#### Creating a Configuration File

Export the default configuration to see all available options:

```bash
# Export default configuration
repo-statter --export-config my-config.json

# This creates a JSON file with all available settings and their defaults
```

#### Using a Configuration File

```bash
# Use your custom configuration
repo-statter --config-file my-config.json

# Configuration files can be combined with other options
repo-statter /path/to/repo --config-file my-config.json --output reports
```

#### Configuration Categories

The exported configuration file includes settings for:

- **Analysis**: Commit limits, byte estimation, time series thresholds
- **Word Cloud**: Size, word limits, display parameters  
- **Charts**: Dimensions, limits for various chart types
- **File Heat**: Recency decay, weighting factors, display limits
- **Performance**: Caching, progress reporting settings
- **Exclusions**: File patterns to ignore during analysis
- **File Types**: Extension mappings and binary file detection
- **Text Analysis**: Stop words for text processing
- **File Categories**: Patterns for categorizing files
- **Commit Filters**: Patterns for filtering merge/automated commits

#### Example Workflow

```bash
# 1. Export the default configuration
repo-statter --export-config project-config.json

# 2. Edit project-config.json to customize settings
#    For example, increase word cloud size:
#    "wordCloud": { "maxWords": 200, "minWordLength": 4 }

# 3. Use your customized configuration
repo-statter --config-file project-config.json
```

### Performance Caching

Repo Statter includes intelligent caching to dramatically speed up subsequent runs on the same repository:

- **First run**: Processes all commits and saves processed data to cache
- **Subsequent runs**: Only processes new commits since last run (50-90% faster)
- **Cache location**: System temp directory (`/tmp/repo-statter-cache/` on Unix systems)
- **Cache invalidation**: Automatic based on repository changes

#### Cache Management

```bash
# Normal run with caching (default)
repo-statter

# Disable caching (always do full scan)
repo-statter --no-cache

# Clear cache and regenerate (useful after git history changes)
repo-statter --clear-cache
```

#### Performance Impact

- **Large repositories**: 50-90% speed improvement on subsequent runs
- **Small repositories**: 20-40% speed improvement  
- **Cache overhead**: Minimal (1-5% slower on first run)
- **Incremental updates**: Near-instant for repositories with few new commits

## Features

-   **Comprehensive Git Analysis**: Analyzes complete commit history with line-by-line statistics.
-   **Interactive Visualizations**: Beautiful charts showing commit activity, contributor statistics, file type distribution, and lines of code growth.
-   **Intelligent Caching**: Dramatically speeds up subsequent runs with incremental processing (50-90% faster).
-   **Self-Contained Reports**: Generates standalone HTML files with embedded data and charts, requiring no external dependencies to view.
-   **Flexible Output**: Choose between quick builds or structured analysis output.
-   **Zero Runtime Dependencies**: Reports work offline with no external dependencies.

## Report Contents

The generated report includes:

### Key Statistics
- Total commits
- Total lines of code
- Top contributor
- Generation date

### Interactive Charts
1. **Commit Activity Over Time** - Area chart showing daily commit frequency
2. **Top Contributors** - Bar chart of most active contributors
3. **Lines of Code Growth** - Cumulative lines of code over project lifetime
4. **File Type Distribution** - Donut chart showing code distribution by language

### Detailed Data
The JSON output (`repo-stats.json`) contains:
- Complete commit history with messages, authors, and timestamps
- Line-by-line additions and deletions per commit
- File change details for each commit
- Aggregated contributor statistics
- File type analysis

## Development

### Tech Stack
- **Runtime**: Node.js with TypeScript
- **Git Integration**: simple-git
- **Charts**: ApexCharts (embedded in output)
- **Styling**: Bootstrap 5 (embedded in output)

### Project Structure
```
repo-statter/
├── src/
│   ├── index.ts           # Main entry point and CLI
│   └── report/
│       ├── template.html  # Report HTML template
│       └── renderer.ts    # Chart rendering logic
├── docs/
│   └── todo/             # Project documentation and tasks
├── tests/                # Test files
└── package.json          # Project configuration
```

### Running Tests

```bash
npm test                  # Run tests once
npm run test:coverage    # Run tests with coverage
npm run test:report      # Generate report from test repo (reuses existing or creates new)
npm run test:clean       # Clean up persistent test repository
```

### Type Checking

```bash
npm run typecheck        # Run TypeScript type checking
```

### Development Workflow

For rapid development and testing:

```bash
# First time or after cleanup
npm run test:report      # Creates test repo and generates report

# Subsequent runs (much faster - reuses existing test repo)
npm run test:report      # Analyzes existing test repo

# When you need a fresh test repo
npm run test:clean       # Remove persistent test repo
npm run test:report      # Creates new test repo and generates report
```

The test report is always generated at `dist/test-repo-analysis.html` for consistent access.

## Requirements

- Node.js 18+ (for native fetch support)
- Git repository to analyze
- Write access to create output directories

## Output Examples

### HTML Report
The HTML report is a beautiful dashboard that works entirely offline. It includes:
- Responsive design that works on desktop and mobile
- Interactive charts with hover tooltips
- Professional styling with smooth animations
- Zero external dependencies - everything is embedded

### JSON Statistics
The JSON file provides raw data for further analysis, including:
```json
{
  "repository": "repo-statter",
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "totalCommits": 150,
  "totalLinesAdded": 12500,
  "totalLinesDeleted": 3200,
  "contributors": [...],
  "fileTypes": [...],
  "commits": [...]
}
```

## Future Enhancements

See the `docs/todo/` directory for planned features including:
- Code churn analysis
- Commit message word clouds
- Interactive filtering by date/author
- File heatmaps
- Enhanced visualizations

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

This is a private project. See `docs/todo/` for development tasks and guidelines.