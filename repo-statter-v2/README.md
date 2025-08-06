# Repo-Statter V2

Next-generation git repository analyzer with streaming architecture and modular design.

## 🚀 Features

- **Streaming Architecture**: Process repositories of any size without memory constraints
- **Modular Design**: Separate packages for core logic, visualizations, and CLI
- **Type Safety**: Strict TypeScript with comprehensive type definitions
- **Performance**: Optimized for large repositories (1M+ commits)
- **Browser Playground**: Test visualization components interactively
- **V1 Compatibility**: Migration tools and compatibility layer

## 📦 Packages

### @repo-statter/core
Core functionality including:
- Type definitions for git and analysis data
- Streaming git parser for memory-efficient processing
- Error handling with user-friendly messages
- Structured logging with multiple output formats

### @repo-statter/visualizations (Coming Soon)
Standalone visualization components:
- Time series charts
- Contributor statistics
- File heatmaps
- Language distribution

### @repo-statter/report-builder (Coming Soon)
HTML report generation:
- Template engine
- Asset bundling
- Progressive enhancement

### @repo-statter/cli (Coming Soon)
Command-line interface:
- V1 compatibility layer
- Progress reporting
- Configuration management

## 🛠 Development

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Setup
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format
```

### Project Structure
```
repo-statter-v2/
├── packages/
│   ├── core/                 # Core business logic
│   ├── visualizations/       # UI components
│   ├── report-builder/       # Report generation
│   └── cli/                  # CLI interface
├── apps/
│   ├── playground/           # Component testing
│   └── e2e/                  # End-to-end tests
└── docs/                     # Documentation
```

## 🔄 Migration from V1

The V2 architecture provides:
- Backward compatibility for critical CLI commands
- Automatic cache migration
- Configuration conversion utilities

See the [migration guide](docs/migration.md) for details.

## 📈 Performance

V2 targets:
- Parse 1000+ commits/second
- Memory usage under 256MB for 1M commits
- Build time under 10 seconds
- Chart interactions at 60fps

## 🧪 Testing

The project uses Vitest for testing:
```bash
# Run unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## 📝 License

MIT