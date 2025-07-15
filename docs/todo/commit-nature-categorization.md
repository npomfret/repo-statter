Depends on: [phase-1-core-data-collection.md](phase-1-core-data-collection.md)

# Commit Nature Categorization

## 1. Objective

To automatically categorize each commit into a specific "nature" or "type" based on its commit message. This will allow for deeper insights, such as understanding the ratio of new features to bug fixes or how much effort is spent on refactoring versus documentation.

## 2. Mechanism: A Scoring-Based Approach

Instead of assigning a single category, a more nuanced approach is to **score** each commit against all defined categories. This acknowledges that a single commit can have multiple intents (e.g., a new feature that also includes some refactoring).

The process will be as follows:

1.  **Pattern Matching:** The entire commit message (header and body) will be scanned for all configured patterns.
2.  **Scoring:** Each time a pattern is matched, a score is added to its corresponding category.
3.  **Weighting:** Categories can have a `weight` (defaulting to 1.0) in the configuration. The final score for a category will be the number of matches multiplied by its weight.
4.  **Normalization:** The final scores for the commit can be normalized (e.g., so they sum to 1.0) to represent the distribution of effort within that commit.

This approach provides a much richer dataset, allowing for visualizations that show the blended nature of development work.

## 3. Default Categories & Patterns

A default set of categories will be provided out-of-the-box.

| Category | Default Pattern (Regex) | Description |
| :--- | :--- | :--- |
| **New Feature** | `feat` | A new feature for the user. |
| **Bug Fix** | `fix` | A bug fix for the user. |
| **Refactoring**| `refactor`| A code change that neither fixes a bug nor adds a feature. |
| **Testing** | `test` | Adding missing tests or correcting existing tests. |
| **Documentation**| `docs` | Documentation only changes. |
| **Build/CI/CD**| `build` | Changes that affect the build system or external dependencies. |
| **Chores** | `chore` | Other changes that don't modify src or test files. |
| **Performance** | `perf` | A code change that improves performance. |
| **Code Style** | `style` | Changes that do not affect the meaning of the code (white-space, etc). |
| **Revert** | `revert` | Reverts a previous commit. |

## 4. Configuration

The categorization will be highly configurable via a JSON file. Users can define categories, patterns, and weights.

**Example `categorization.json`:**
```json
[
  {
    "category": "Security Fix",
    "pattern": "security",
    "weight": 1.5
  },
  {
    "category": "New Feature",
    "pattern": "feat:",
    "weight": 1.0
  },
  {
    "category": "Refactoring",
    "pattern": "refactor",
    "weight": 0.8
  },
  {
    "category": "Bug Fix",
    "pattern": "fix:",
    "weight": 1.0
  }
]
```
Unlike the single-category approach, the order in this configuration does not imply priority, as all patterns will be checked.

## 5. Data Integration

The `nature` field will be replaced by a `natureScores` object, which maps each relevant category to its calculated score for that commit.

**Example `commit` object extension:**
```json
{
  "sha": "a1b2c3d4e5f6...",
  "authorName": "Jane Doe",
  "authorEmail": "jane.doe@example.com",
  "date": "2025-07-15T09:30:00.000Z",
  "message": "feat: Add new charting component\n\n- Refactor the data model for performance",
  "natureScores": {
    "New Feature": 1.0,
    "Refactoring": 0.8,
    "Performance": 1.0
  },
  "stats": { ... },
  "changes": [ ... ]
}
```
