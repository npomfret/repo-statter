# Export Options

## Idea
Allow exporting individual charts as images (PNG/SVG) and raw data as CSV, enhancing the utility of the generated reports for external analysis or presentations.

## Implementation Suggestions

### 1. Chart Export
- **ApexCharts API:** ApexCharts provides built-in export functionality. This can be enabled in the chart options (`chart.toolbar.export`).
- **Custom Export Buttons:** Add custom buttons next to each chart (or a global export menu) that trigger the ApexCharts export methods for PNG, SVG, or CSV (for chart data).
- **Client-side Rendering:** The export will happen client-side, directly from the rendered chart.

### 2. Data Export (CSV)
- **Raw Data Export:** Provide a button or link to download the raw `repo-stats.json` data as a JSON file (already supported by the `analysis` mode).
- **Tabular Data Export:** For specific tables or aggregated data (e.g., contributor list, file type breakdown), implement a function to convert the JavaScript array of objects into a CSV string.
- **Download Trigger:** Use a JavaScript function to create a Blob from the CSV string and trigger a download (e.g., `URL.createObjectURL` and a temporary `<a>` tag).

### 3. Server-side Export (Advanced)
- **Headless Browser:** For more complex or high-fidelity exports (e.g., PDF of the entire report), consider a server-side solution using a headless browser like Puppeteer or Playwright to render the HTML report and then capture it as a PDF or high-res image.
- **API Endpoint:** This would require a new API endpoint in the Node.js backend to handle the export request.

## Impact
- Increases the reusability of the generated data and visualizations.
- Facilitates sharing insights with stakeholders who may not interact directly with the report.
- Enables further analysis in other tools (e.g., spreadsheets, BI dashboards).
- Improves the overall value proposition of the `repo-statter` tool.
