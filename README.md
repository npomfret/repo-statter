# Repo Statter

A powerful Git repository analysis tool that generates beautiful, interactive HTML reports with detailed statistics about your codebase.

## Features

- **Comprehensive Git Analysis**: Analyzes complete commit history with line-by-line statistics
- **Interactive Visualizations**: Beautiful charts showing commit activity, contributor statistics, file type distribution, and lines of code growth
- **Self-Contained Reports**: Generates standalone HTML files with embedded data and charts
- **Flexible Output**: Choose between quick builds or structured analysis output
- **Zero Runtime Dependencies**: Reports work offline with no external dependencies

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/repo-statter.git
cd repo-statter

# Install dependencies
npm install
```

## Usage

### Quick Build Mode

Generate a report in the `dist/` directory:

```bash
npm run build .                    # Analyze current directory
npm run build /path/to/repository  # Analyze specific repository
```

Output: `dist/report.html`

### Full Analysis Mode

Generate a structured analysis with both HTML report and JSON data:

```bash
npm run analyse -- --repo .                    # Analyze current directory
npm run analyse -- --repo /path/to/repository  # Analyze specific repository
```

Output:
- `analysis/<repository-name>/report.html` - Interactive HTML report
- `analysis/<repository-name>/repo-stats.json` - Raw statistics data

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