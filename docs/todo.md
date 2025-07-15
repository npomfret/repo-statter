# Repo Statter - To-Do and Implementation Plan

## 1. Project Goal

To create a beautiful, interactive, single-page HTML report that visualizes statistics for a given Git repository. The report should be self-contained and easily shareable.

## 2. Recommended Technology Stack

*   **Charting Library:** **ApexCharts.js**
    *   **Reasoning:** ApexCharts provides a wide range of modern, responsive, and highly interactive charts with a beautiful default aesthetic. It's well-documented, easy to use, and can handle the types of data visualizations we need (timelines, bar charts, pie charts, heatmaps).
*   **UI/Styling:** **Bootstrap**
    *   **Reasoning:** To ensure the report is well-structured, responsive, and visually appealing without writing a lot of custom CSS. We can use its grid system for layout and its components for a consistent look and feel.
*   **Core Logic/Data Generation:** **TypeScript** (already in use)
    *   **Reasoning:** We'll continue to use the existing TypeScript setup to handle the logic of collecting and processing the repository data.
*   **Build Process:** **tsup** and **Shell Scripts**
    *   **Reasoning:** Leverage the existing `tsup` configuration for transpiling TypeScript and use simple shell scripts to orchestrate the data generation and HTML report creation process.

## 3. Step-by-Step Implementation Plan

### Phase 1: Core Data Collection

*   **Step 1: Git Log Parsing:**
    *   In `src/index.ts`, use a library like `simple-git` or execute `git log` commands directly to parse the entire commit history of a repository.
    *   For each commit, extract the hash, author name, author email, date, and commit message.

*   **Step 2: Line-by-Line Stats:**
    *   For each commit, get the diff stats (`git diff --numstat <commit-hash>^!`).
    *   Parse the output to get the lines added and deleted for each file.
    *   Categorize these changes by file extension (e.g., `.ts`, `.js`, `.css`).
    *   Aggregate this data per author and per file type.

*   **Step 3: Source Code Size (Bytes):**
    *   For each commit, check out the commit (`git checkout <commit-hash>`).
    *   Walk the file tree, get the size of each source file, and sum them up.
    *   Store this as a timeseries data point.
    *   **Note:** This is a slow process. We can make it an optional feature.

*   **Step 4: Data Structuring:**
    *   Consolidate all collected data into a single, well-structured JSON object. This object will be the single source of truth for the HTML report. It should be designed for easy consumption by ApexCharts.

### Phase 2: HTML Report Scaffolding

*   **Step 5: Create Report Template:**
    *   Create a directory `src/report`.
    *   Inside `src/report`, create a file named `template.html`.
    *   This file will be the skeleton of our final report.
    *   Include ApexCharts and Bootstrap via CDN in the `<head>` for simplicity.

*   **Step 6: Design Report Layout:**
    *   Use Bootstrap's grid system in `template.html` to create a professional layout.
    *   **Layout Idea:**
        *   A main header with the repository name and report generation date.
        *   A row of "Key Stats" cards (e.g., Total Commits, Total Lines of Code, Top Contributor).
        *   A main content area with multiple chart containers.

### Phase 3: Visualization and Interactivity

*   **Step 7: Create a Rendering Script:**
    *   Create a new file `src/report/renderer.ts`.
    *   This script will contain functions that take the JSON data and render the charts into the containers defined in `template.html`.

*   **Step 8: Implement Charts:**
    *   **LOC Over Time:** An area chart showing total lines of code added and deleted over time.
    *   **Commit Activity:** A heatmap showing commit frequency by day of the week and hour of the day.
    *   **Contributor Breakdown:** A bar chart showing commits per author and another showing lines of code contributed per author.
    *   **Language/File Type Distribution:** A donut chart showing the percentage of lines of code per file type.
    *   **Byte Size Over Time:** A line chart showing the total byte size of the source code over time.

*   **Step 9: Add Interactivity:**
    *   Configure tooltips for all charts to show detailed data on hover.
    *   Enable zooming and panning on time-series charts.
    *   Add clickable legends to filter data series.

### Phase 4: Build and Finalize

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

## 4. Definition of Done

The tool is "done" when a user can run a single command, point it at a local Git repository, and get a single, beautiful, interactive `report.html` file that provides meaningful insights into the repository's history and composition.
