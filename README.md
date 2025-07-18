# Repo Statter

Repo Statter is a work-in-progress Git repository analysis tool designed to generate insightful, interactive HTML reports. It provides detailed statistics about your codebase, helping you understand its evolution and characteristics.

**Please Note:** This project is currently under active development. There is no official NPM package available yet. Please note that it is currently designed for small to medium-sized projects and may not scale efficiently for very large repositories (yet).

## How to Use (it's still in development)

To use Repo Statter, you'll need to clone the repository and run it directly. There is no npm artefact, yet.

### Prerequisites

- Node.js (version 18 or higher)
- Git

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/repo-statter.git
    cd repo-statter
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Generating Reports

You can generate reports in two modes:

#### To run analysis

Thisgenerates both an interactive HTML report and a raw JSON data file with detailed statistics. The output will be placed in an `analysis/` directory, structured by repository name.

```bash
npm run analyse -- --repo /path/to/your/repo   # Analyze a specific Git repository
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
- `--max-commits <number>` - Maximum number of recent commits to analyze (default: `"1000"`)
- `-h, --help` - Display help information
- `-V, --version` - Display version number

#### Examples

```bash
# Analyze current directory with default settings
npm run analyse

# Analyze specific repository
npm run analyse /path/to/repo

# Analyze with custom output directory
npm run analyse . -- --output reports

# Analyze only the last 500 commits
npm run analyse . -- --max-commits 500

# Combine options
npm run analyse -- --repo /path/to/repo --output custom-dir --max-commits 2000
```

#### Notes

- The `--max-commits` option analyzes the most recent N commits, which can significantly improve performance for large repositories
- When using npm scripts, remember to use `--` before passing options to separate npm arguments from script arguments
- Output paths are relative to the current working directory

## Features

-   **Comprehensive Git Analysis**: Analyzes complete commit history with line-by-line statistics.
-   **Interactive Visualizations**: Beautiful charts showing commit activity, contributor statistics, file type distribution, and lines of code growth.
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
npm test                  # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run tests with coverage
```

### Type Checking

```bash
npm run typecheck        # Run TypeScript type checking
```

## Requirements

- Node.js 18+ (for native fetch support)
- Git repository to analyze
- Write access to create output directories

## Output Examples

### HTML Report
The HTML report is a beautiful, dark-themed dashboard that works entirely offline. It includes:
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

This project is private and not currently licensed for public use.

## Contributing

This is a private project. See `docs/todo/` for development tasks and guidelines.