Depends on: [phase-3-visualization-and-interactivity.md](phase-3-visualization-and-interactivity.md)

# Phase 4: Build and Finalize

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