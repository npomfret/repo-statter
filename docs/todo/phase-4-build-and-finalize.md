Depends on: [phase-3-visualization-and-interactivity.md](phase-3-visualization-and-interactivity.md)

# Phase 4: Build and Finalize

## Implementation Plan

**Selected Task: Step 10 - Create the Build Script**

### Status: ✅ COMPLETE
✅ Phase 1 (Core Data Collection) - Complete
✅ Phase 2 (HTML Report Scaffolding) - Complete  
✅ Phase 3 (Visualization and Interactivity) - Complete
✅ Step 10 (Build Script) - Complete

### Detailed Implementation Steps
1. ✅ **Create report generation function** - Added `generateReport(repoPath: string)` function to `src/index.ts`
2. ✅ **Create build directory structure** - Implemented automatic `dist/` directory creation
3. ✅ **Implement template injection** - Created function to inject JSON data and chart rendering into HTML template
4. ✅ **Add npm script** - Added `build` script to `package.json` that accepts repo path argument
5. ✅ **Create output file** - Implemented writing final self-contained HTML to `dist/report.html`

### Technical Details
- Read HTML template from `src/report/template.html`
- Inject repository data into template placeholders (`{{repositoryName}}`, `{{generationDate}}`, etc.)
- Embed JSON data directly in HTML within `<script>` tags
- Include chart rendering code from `src/report/renderer.ts` inline
- Create fully self-contained HTML file that works without external dependencies
- Use filesystem operations to create `dist/` directory if it doesn't exist

### Approach Analysis
**Multiple approaches considered:**
1. **Shell script approach** - Create `build.sh` script (less integrated)
2. **npm script approach** - Add to `package.json` scripts (more integrated)
3. **Dedicated build function** - Create `generateReport()` function in main module (most maintainable)

**Selected approach: Dedicated build function**
- Most consistent with existing TypeScript codebase
- Allows for better error handling and type safety
- Easier to test and maintain
- Can be easily integrated into npm scripts

### Breaking Down Into Smaller Steps
This task can be committed in one focused commit since it's a single cohesive feature, but if needed, it could be broken down as:
1. Create `generateReport()` function skeleton
2. Implement template reading and placeholder injection
3. Add chart rendering integration
4. Add npm script and directory creation

### Commit Strategy
Single focused commit: "Add build script to generate self-contained HTML reports"

### Files to Modify
- `src/index.ts` - Add `generateReport()` function
- `package.json` - Add `build` script
- Create `dist/` directory (automatically)

### Files Created
- ✅ `dist/report.html` - Generated output file (ignored by git)
- ✅ Updated `.gitignore` - Added `dist/` directory to ignore generated files

### Implementation Results
**Build Script Usage:**
```bash
npm run build .              # Generate report for current directory
npm run build /path/to/repo  # Generate report for specific repository
```

**Output Features:**
- Self-contained HTML with embedded ApexCharts
- Template placeholders properly replaced with repository data
- Professional Bootstrap styling with dark theme
- Interactive charts for commit activity, contributors, file types, and LOC growth
- Automatic directory creation and file management

**Test Results:**
- Successfully generated report for current repo (23 commits, 8,691 lines added)
- All TypeScript compilation passes without errors
- Generated `dist/report.html` with complete functionality

### Next Steps After This Task
- Step 11: CLI Integration (enhance with command-line argument parsing)
- Consider adding additional chart types or filtering options

---

## Step 11: CLI Integration

### Status: ✅ COMPLETE

### Analysis
There's a discrepancy between the CLI Interface specification and the current implementation:
- **Current implementation**: Uses `npm run build .` with positional argument
- **CLI spec**: Requires `npm run analyse -- --repo .` with named argument

### Decision
Since Step 10 is complete and functional, I recommend keeping the existing `build` script and adding the new `analyse` script as specified. This provides backward compatibility while implementing the full CLI interface.

### Implementation Plan

#### 1. Install Dependencies
- Add `yargs` for robust CLI argument parsing
- Alternative: Use Node's built-in `process.argv` parsing (simpler, no deps)

#### 2. Create CLI Entry Point
- Option A: Update `src/index.ts` to handle both CLI and programmatic usage
- Option B: Create new `src/cli.ts` file dedicated to CLI handling (cleaner separation)

#### 3. Implement Argument Parsing
- Parse `--repo` argument as required
- Add validation for repository path existence
- Add help text and usage examples

#### 4. Update Output Structure
- Current: Outputs to `dist/report.html`
- Required: Output to `analysis/<repo-name>/report.html` and `analysis/<repo-name>/repo-stats.json`
- Need to extract repository name from path
- Need to save JSON data separately

#### 5. Update npm Scripts
- Add new `analyse` script to package.json
- Keep existing `build` script for backward compatibility

#### 6. Update .gitignore
- Add `analysis/` directory to gitignore

### Breaking Down Into Commits
1. **Commit 1**: Add CLI parsing and validation
   - Install yargs (or implement native parsing)
   - Create CLI handler with --repo argument
   - Add path validation

2. **Commit 2**: Update output structure
   - Change output to `analysis/` directory structure
   - Save both HTML and JSON files
   - Update .gitignore

3. **Commit 3**: Add analyse npm script
   - Update package.json with new script
   - Update documentation if needed

### Files to Modify
- `src/index.ts` or create `src/cli.ts`
- `package.json` - Add yargs dependency and analyse script
- `.gitignore` - Add analysis/ directory
- Potentially `src/index.ts` - Update generateReport function to support new output structure

### Minimal Approach (Recommended)
Given the CLAUDE.md guidance to "be minimal and elegant" and "do not add any superfluous code", I recommend:
1. Use Node's built-in process.argv parsing instead of adding yargs dependency
2. Modify existing generateReport function to accept output directory option
3. Add simple CLI handling to src/index.ts
4. Single commit for the complete feature

### Implementation Results

✅ **Completed Implementation:**
1. Added CLI argument parsing for `--repo` flag using native process.argv
2. Updated `generateReport()` to support two output modes:
   - `dist` mode: Outputs to `dist/report.html` (for build command)
   - `analysis` mode: Outputs to `analysis/<repo-name>/report.html` and `analysis/<repo-name>/repo-stats.json`
3. Added input validation for repository path
4. Maintained backward compatibility with existing `build` command
5. Switched from ts-node to tsx for better ESM support and performance

**Key Changes:**
- Modified `src/index.ts` to handle both CLI modes
- Updated all npm scripts to use tsx instead of ts-node
- Created comprehensive README.md documentation
- No additional dependencies needed (except tsx for better TypeScript execution)

**Usage:**
```bash
# Quick build mode
npm run build .

# Full analysis mode
npm run analyse -- --repo /path/to/repository
```

**Output Structure:**
- Build mode: `dist/report.html`
- Analysis mode: 
  - `analysis/<repo-name>/report.html`
  - `analysis/<repo-name>/repo-stats.json`

---

*   **Step 10: Create the Build Script:**
    *   Modify the `package.json` scripts or create a new build script (`build.sh`).
    *   The script will:
        1.  Run the main data collection process (`ts-node src/index.ts`) to generate the `stats.json` file.
        2.  Read the `stats.json` file.
        3.  Read the `src/report/template.html` file.
        4.  Inject the JSON data into the template within a `<script>` tag.
        5.  Write the final, self-contained HTML to a `dist/` directory as `report.html`.

*   **Step 11: CLI Integration:**
    *   Update `src/index.ts` to be a command-line tool (using a library like `yargs` or `commander`).
    *   It should accept a path to a repository as an argument.
    *   It will then perform all the steps above to generate the report for that repository.