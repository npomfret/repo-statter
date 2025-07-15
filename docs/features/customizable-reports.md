# Customizable Reports

## Idea
Enable users to select which charts and metrics are included in the report and their order, allowing for tailored reports based on specific analytical needs.

## Implementation Suggestions

### 1. Configuration Input
- **CLI Arguments:** Extend the CLI to accept arguments for report customization (e.g., `--include-chart commit-activity --exclude-chart file-types`).
- **Configuration File:** A more robust solution would be a JSON configuration file (e.g., `report-config.json`) where users can specify:
    - `charts`: An array of chart IDs to include (e.g., `["commitActivity", "linesOfCode", "contributors"]`).
    - `order`: An array specifying the order of sections/charts.
    - `metrics`: An array of key statistics to display.
    - `theme`: Light/Dark mode preference.

### 2. Template Generation Logic
- **Modular Template:** Break down `src/report/template.html` into smaller, reusable components (e.g., `chart-section-commit-activity.html`, `metrics-panel.html`).
- **Dynamic HTML Assembly:** In `src/report/generator.ts`, based on the user's configuration, dynamically assemble the HTML report by including only the specified components and arranging them in the desired order.
- **Conditional Rendering in Frontend:** Alternatively, pass the configuration to the frontend JavaScript, and use JavaScript to conditionally show/hide and reorder chart containers.

### 3. UI for Configuration (Future)
- **Web-based Configurator:** For a more user-friendly experience, consider a simple web-based UI that allows users to drag-and-drop charts, select metrics, and then generates the `report-config.json` file.

## Impact
- Increases the flexibility and utility of the tool for diverse use cases.
- Reduces visual clutter by allowing users to focus on relevant data.
- Caters to different roles (e.g., project managers might want high-level summaries, developers might want detailed code metrics).
