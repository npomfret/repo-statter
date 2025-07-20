# Configuration File Support

## Idea
Allow users to define default settings, exclusion patterns, and report customization in a configuration file (e.g., `repo-statter.json`), reducing the need for lengthy CLI arguments.

## Implementation Suggestions

### 1. Configuration File Format
- **JSON:** A simple and widely understood format (e.g., `repo-statter.json`).
- **YAML/TOML (Optional):** Could be considered for more complex configurations, but JSON is a good starting point.

### 2. Configuration Loading
- **Search Path:** Implement logic to search for the configuration file in common locations (e.g., current working directory, user's home directory, project root).
- **Parsing:** Use Node.js's built-in `fs` and `JSON.parse` to read and parse the file.
- **Schema Validation (Optional but Recommended):** Use a library like `Joi` or `Zod` to validate the loaded configuration against a predefined schema, providing helpful error messages if the config is malformed.

### 3. Merging Configuration
- **CLI Arguments Priority:** CLI arguments should always override settings defined in the configuration file.
- **Default Values:** The configuration file settings should override hardcoded default values.

### 4. Settings to Include
- **Exclusion Patterns:** Define patterns for files/directories to exclude from analysis (e.g., `node_modules`, `dist`, test files).
- **Report Customization:** Settings for which charts to include, their order, theme, etc. (as discussed in "Customizable Reports").
- **GitHub API Token:** (Securely) store the GitHub API token for Issue/PR integration.
- **Module Definitions:** Define logical modules or directories for aggregated statistics.
- **Complexity Tool Paths/Options:** Configuration for external complexity analysis tools.

### 5. Integration with Existing Logic
- Modify `src/cli/handler.ts` and `src/report/generator.ts` to read and apply settings from the configuration object.

## Impact
- Simplifies repeated runs of the tool with the same settings.
- Improves user experience by reducing CLI argument complexity.
- Enables more complex and persistent configurations.
- Facilitates sharing configurations within a team.
