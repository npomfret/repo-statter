# CI/CD Integration Examples

## Idea
Provide clear examples and scripts for integrating report generation into CI/CD pipelines (e.g., GitHub Actions, GitLab CI, Jenkins) for automated analysis and continuous insights.

## Implementation Suggestions

### 1. Example Workflow Files
- **GitHub Actions:** Create a `.github/workflows/repo-statter.yml` example.
- **GitLab CI:** Create a `.gitlab-ci.yml` snippet.
- **Jenkinsfile:** Provide a basic `Jenkinsfile` example.
- **Other CIs:** Consider adding examples for popular CIs like Azure DevOps, CircleCI, Travis CI.

### 2. Key Steps in CI/CD
- **Checkout Repository:** Standard step to get the code.
- **Install Dependencies:** `npm install` or `yarn install`.
- **Run `repo-statter`:** Execute the CLI command to generate the report (e.g., `npm run analyse -- --repo .`).
- **Artifact Upload:** Upload the generated HTML report and JSON data as build artifacts so they can be downloaded and viewed.
- **Conditional Execution:** Show how to run the analysis only on specific branches (e.g., `main`, `develop`) or on pull requests.
- **Status Checks (Optional):** Integrate with CI/CD status checks to fail a build if certain metrics (e.g., code complexity, churn) exceed predefined thresholds.

### 3. Documentation
- **Dedicated `docs/ci-cd.md`:** Create a new documentation file explaining the benefits of CI/CD integration and providing step-by-step instructions for each example.
- **Environment Variables:** Explain how to pass sensitive information like GitHub API tokens via environment variables in the CI/CD pipeline.

### 4. Docker Image (Advanced)
- **Containerization:** Provide a `Dockerfile` to build a Docker image for `repo-statter`. This makes it easier to run in any CI/CD environment without worrying about Node.js versions or dependencies.

## Impact
- Automates the generation of valuable repository insights.
- Ensures continuous monitoring of codebase health and development trends.
- Facilitates proactive identification of issues (e.g., high churn, complexity).
- Makes `repo-statter` a more integral part of the development workflow.
