# Plan: Publish Self-Report on GitHub Pages

This document outlines the steps required to automatically generate and publish the `repo-statter`'s own analysis report (the "self-report") to GitHub Pages.

## Goal

To have an up-to-date analysis report of the `repo-statter` repository itself, accessible via GitHub Pages (e.g., `https://<username>.github.io/repo-statter/`).

## Steps

### 1. Ensure Report Generation Capability

*   **Verify `repo-statter` can generate its own report:** Confirm that running the `repo-statter` tool against its own repository produces a valid HTML report.
    *   *Action:* Identify the command to generate the report (e.g., `npm run build && node dist/index.js --repo . --output report.html`).
    *   *Output:* The generated report (e.g., `report.html`) and any associated assets (CSS, JS, images).

### 2. Choose GitHub Pages Publishing Source

*   **Option: `docs` folder on `main` branch:** This is generally the simplest approach for static sites within a repository.
    *   *Action:* Configure GitHub Pages settings in the repository to serve from the `/docs` folder on the `main` branch.

### 3. Prepare Report for Deployment

*   **Dedicated directory for the self-report:** Create a specific subdirectory within `docs` to house the self-report and its assets to avoid conflicts with other documentation.
    *   *Action:* Create `docs/self-report/`.
*   **Copy generated report:** After generation, the report HTML and its dependencies (CSS, JS, images) must be copied into `docs/self-report/`.
    *   *Action:* Ensure the report generation process outputs directly to or is followed by a step to copy files to `docs/self-report/`. Relative paths within the report HTML must be correct for this new location.

### 4. Automate with GitHub Actions

*   **Create a GitHub Actions workflow:** Set up a workflow that triggers on pushes to the `main` branch (or a schedule) to automate the report generation and deployment.
    *   *File:* `.github/workflows/publish-self-report.yml`
    *   *Workflow Steps:*
        1.  **Checkout code:** Get the latest code.
        2.  **Setup Node.js:** Install Node.js.
        3.  **Install dependencies:** `npm ci`
        4.  **Build `repo-statter`:** `npm run build` (if necessary to create the executable).
        5.  **Generate self-report:** Run the `repo-statter` command against the current repository, outputting to a temporary location.
        6.  **Copy report to `docs/self-report`:** Move the generated HTML and assets to the `docs/self-report` directory.
        7.  **Commit and Push (if necessary):** If the report is generated and committed back to the `main` branch, this step is needed. However, a better approach is to use a dedicated action for deploying to GitHub Pages.
        8.  **Deploy to GitHub Pages:** Use an action like `peaceiris/actions-gh-pages` to deploy the contents of `docs/self-report` to the `gh-pages` branch, which GitHub Pages can then serve.

### 5. Configure GitHub Pages

*   **Repository Settings:** Navigate to your repository settings on GitHub.
*   **Pages Section:** Under "Pages", select the `main` branch and `/docs` folder as the source for GitHub Pages.

## Considerations

*   **Report Size:** Ensure the generated report and its assets are not excessively large, as this could impact load times.
*   **Asset Paths:** Verify that all relative paths for CSS, JavaScript, and images within the generated HTML report are correct when moved to `docs/self-report/`.
*   **Security:** If the report contains sensitive information, ensure it's not publicly accessible. (This is a self-report, so likely not an issue, but good practice to consider).
*   **Custom Domain (Optional):** If a custom domain is desired, configure it in GitHub Pages settings and your DNS provider.
