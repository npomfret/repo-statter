Depends on: [phase-4-build-and-finalize.md](phase-4-build-and-finalize.md)

# CLI Interface

## 1. Objective

To define a simple and clear command-line interface (CLI) for running the repository analysis. The user should be able to point the tool at a local Git repository and receive the output in a predictable location.

## 2. Mechanism

The primary interface will be an `npm` script defined in `package.json`. This script will handle the execution of the core data collection and report generation logic.

*   **Command:** A new script, `analyse`, will be added to `package.json`.
*   **Execution:** The script will run the main application entry point (e.g., `src/index.ts`) using `ts-node` or a compiled JavaScript equivalent.
*   **Argument:** The script will accept a single required argument, `--repo`, which is the absolute or relative path to the local Git repository to be analyzed.

## 3. Command Example

To run the analysis, the user will execute the following command:

```bash
npm run analyse -- --repo /path/to/target/repository
```

Or for a repository in the current directory:

```bash
npm run analyse -- --repo .
```

*Note: The `--` is necessary to pass arguments through `npm` to the underlying script.*

## 4. Output

*   The output will be placed in a directory named `analysis/` at the root of this project.
*   Inside the `analysis/` directory, a new folder will be created named after the target repository (e.g., `analysis/my-cool-project/`).
*   This directory will contain the final `report.html` and the `repo-stats.json` data file.

**Example Output Structure:**

```
repo-statter/
├── analysis/
│   └── my-cool-project/
│       ├── report.html
│       └── repo-stats.json
├── src/
└── package.json
```

## 5. Gitignore

The `analysis/` directory should be ignored by Git to prevent generated reports from being committed to the project's own repository. An entry for `analysis/` will be added to the `.gitignore` file.
