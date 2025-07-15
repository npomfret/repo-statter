Depends on: [phase-3-visualization-and-interactivity.md](phase-3-visualization-and-interactivity.md)

# Phase 4: Build and Finalize

## Implementation Plan

**Selected Task: Step 10 - Create the Build Script**

### Status: Ready for Implementation
✅ Phase 1 (Core Data Collection) - Complete
✅ Phase 2 (HTML Report Scaffolding) - Complete  
✅ Phase 3 (Visualization and Interactivity) - Complete

### Detailed Implementation Steps
1. **Create report generation function** - Add `generateReport(repoPath: string)` function to `src/index.ts`
2. **Create build directory structure** - Ensure `dist/` directory exists for output
3. **Implement template injection** - Create function to inject JSON data and chart rendering into HTML template
4. **Add npm script** - Add `build` script to `package.json` that accepts repo path argument
5. **Create output file** - Write final self-contained HTML to `dist/report.html`

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

### Files to Create
- `dist/report.html` - Generated output file (not committed)

### Next Steps After This Task
- Step 11: CLI Integration (enhance with command-line argument parsing)
- Add `.gitignore` entry for `dist/` directory
- Consider adding `dist/` to `.gitignore` to avoid committing generated files

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