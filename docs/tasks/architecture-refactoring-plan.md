# Architecture Refactoring Plan

This document outlines a plan to refactor the architecture of the repo-statter project to improve readability, maintainability, and testability.

## Current Architecture Pain Points

The current architecture has the following pain points:

*   **Tight Coupling:** The data processing logic is tightly coupled with the HTML rendering logic. This makes it difficult to test the individual components and to reuse the data processing logic for other purposes.
*   **Lack of a Clear Data Flow:** The data flows through a series of functions, but there is no clear, unified data pipeline. This makes it difficult to understand how the data is being transformed at each step of the process.
*   **Limited Testability:** Because the data processing and rendering logic are so tightly coupled, it is difficult to write unit tests for the individual components.
*   **Potential for "God" Objects:** The `AnalysisContext` object has the potential to become a "god object" that contains all of the data for the report.

## Proposed Architecture

I propose a new architecture that separates the data processing from the rendering and uses a clear data pipeline. This architecture will be more modular, testable, and maintainable.

Here is a high-level overview of the proposed architecture:

1.  **Data Extraction:**
    *   A new `GitExtractor` class will be responsible for extracting the raw commit data from the git repository. This class will use the `simple-git` library to interact with git.
    *   The `GitExtractor` will produce a stream of `Commit` objects, where each `Commit` object represents a single commit in the repository.

2.  **Data Transformation Pipeline:**
    *   A new `DataPipeline` class will be responsible for transforming the raw commit data into a format that is suitable for rendering.
    *   The `DataPipeline` will consist of a series of "stages," where each stage is a function that takes a stream of `Commit` objects and returns a transformed stream of objects.
    *   The stages in the pipeline will include:
        *   **Contributor Calculator:** Calculates statistics about the contributors to the repository.
        *   **File Calculator:** Calculates statistics about the files in the repository.
        *   **Award Calculator:** Calculates awards for the top commits.
        *   **Time Series Transformer:** Transforms the commit data into a time series format.
        *   **Word Cloud Processor:** Processes the commit messages to generate data for a word cloud.

3.  **HTML Generation:**
    *   A new `ReportGenerator` class will be responsible for generating the final HTML report.
    *   The `ReportGenerator` will take the transformed data from the `DataPipeline` and inject it into an HTML template.
    *   The HTML template will be a simple HTML file with placeholders for the data.

## HTML Generation Improvements

To improve the HTML generation process, I recommend the following:

*   **Use a Templating Engine:** Instead of using a simple string replacement, use a dedicated templating engine like **Handlebars.js** or **Pug**. This will make the templates more readable and maintainable.
*   **Component-Based Architecture:** Break the report down into smaller, reusable components. For example, you could have a separate component for each chart. This will make the code more modular and easier to test.
*   **Separate CSS and JavaScript:** Instead of inlining the CSS and JavaScript in the HTML, separate them into their own files. This will make the code more organized and easier to maintain.
*   **Use a Modern CSS Framework:** Use a modern CSS framework like **Tailwind CSS** or **Bootstrap 5** to style the report. This will make the report more visually appealing and easier to style.
*   **Optimize for Performance:** Optimize the report for performance by minifying the CSS and JavaScript and by using a content delivery network (CDN) to serve the static assets.

By implementing these changes, we can create a more robust and flexible HTML generation process that is easier to maintain and extend.

## Benefits of the Proposed Architecture

*   **Improved Readability:** The code will be more readable because it will be organized into smaller, more focused modules.
*   **Improved Maintainability:** The code will be easier to maintain because the data processing and rendering logic will be decoupled.
*   **Improved Testability:** The code will be easier to test because the individual components can be tested in isolation.
*   **Improved Flexibility:** The data pipeline can be easily extended to support new data transformations and new output formats.