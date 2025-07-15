# Issue/PR Integration

## Idea
For GitHub repositories, fetch and integrate data from issues and pull requests to link code changes directly to tasks or features, providing a more complete picture of development.

## Implementation Suggestions

### 1. Data Source & API Integration
- **GitHub API:** Utilize the GitHub REST API to fetch issues and pull requests. This will require an API token (read-only access).
- **Authentication:** Implement a secure way to handle GitHub API tokens. This could be via environment variables or a configuration file that is explicitly excluded from version control.
- **Rate Limiting:** Implement robust rate limiting and error handling for API calls.

### 2. Data Linking
- **Commit Message Parsing:** Parse commit messages for references to issues or pull requests (e.g., `Fix #123`, `Closes #456`, `GH-789`). Regular expressions can be used for this.
- **Branch Naming Conventions:** If the project uses branch naming conventions (e.g., `feature/ISSUE-123-my-feature`), extract issue numbers from branch names.
- **API Lookup:** For each identified issue/PR number, make an API call to fetch its details (title, status, labels, assignee, creation/closing dates).

### 3. Data Augmentation
- **Augment `CommitData`:** Add fields to `CommitData` (or a related structure) to store linked issue/PR information.
- **New Data Structures:** Create new data structures to hold issue and PR details.

### 4. Reporting & Visualization
- **Commit Details Enhancement:** In the detailed commit view, display linked issues/PRs with their status and title.
- **Issue/PR Summary:** Add a new section to the report summarizing open/closed issues, average time to close, and distribution by labels or assignees.
- **Feature/Bug Tracking:** Visualize code changes grouped by feature or bug fix (derived from issue/PR labels).
- **Development Cycle Visualization:** Chart the lifecycle of issues/PRs, showing time spent in different states (e.g., open, in progress, review, closed).
- **Contributor Activity by Issue Type:** Analyze which contributors work on which types of issues (e.g., bugs vs. features).

## Impact
- Provides context for code changes, linking them to business value or bug fixes.
- Helps understand the development process and identify bottlenecks.
- Improves traceability and accountability.
- Offers insights into team focus and resource allocation.
