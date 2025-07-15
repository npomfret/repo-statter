# Recommended Technology Stack

This document is a prerequisite for all other TODOs.

*   **Charting Library:** **ApexCharts.js**
    *   **Reasoning:** ApexCharts provides a wide range of modern, responsive, and highly interactive charts with a beautiful default aesthetic. It's well-documented, easy to use, and can handle the types of data visualizations we need (timelines, bar charts, pie charts, heatmaps).
*   **UI/Styling:** **Bootstrap**
    *   **Reasoning:** To ensure the report is well-structured, responsive, and visually appealing without writing a lot of custom CSS. We can use its grid system for layout and its components for a consistent look and feel.
*   **Core Logic/Data Generation:** **TypeScript** (already in use)
    *   **Reasoning:** We'll continue to use the existing TypeScript setup to handle the logic of collecting and processing the repository data.
*   **Build Process:** **tsup** and **Shell Scripts**
    *   **Reasoning:** Leverage the existing `tsup` configuration for transpiling TypeScript and use simple shell scripts to orchestrate the data generation and HTML report creation process.