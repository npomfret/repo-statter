Depends on: [phase-1-core-data-collection.md](phase-1-core-data-collection.md)

# Phase 2: HTML Report Scaffolding

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