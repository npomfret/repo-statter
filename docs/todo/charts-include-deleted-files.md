# Bug Report: Charts Include Deleted Files

## Summary

The "File Types" chart and the "Largest / Most Churn" charts are including data from files that have been deleted from the repository. These charts should only reflect the state of the files present in the latest commit (i.e., at HEAD).

## Affected Charts

- **File Types Chart:** This chart currently aggregates file type statistics over the entire history of the repository. If a file type was once prevalent but has since been completely removed (e.g., migrating from `.js` to `.ts`), it still appears in the chart, which is misleading.
- **Top Files (Largest / Most Churn) Charts:** These charts list files that may no longer exist. A file that was once very large or had a high amount of churn but was subsequently deleted will still incorrectly appear in these rankings.

## Expected Behavior

All chart calculations that are based on the current state of the repository should only consider the files that exist in the latest commit. The analysis should be performed on the repository's file tree as of HEAD, not on the entire git history for these specific metrics.

## Steps to Reproduce

1. Create a repository.
2. Add a large file of a unique type (e.g., `my-large-file.foo`).
3. Commit the file.
4. Delete the file `my-large-file.foo`.
5. Commit the deletion.
6. Run the repo-statter analysis.
7. Observe that the "File Types" chart includes `.foo` and the "Largest Files" chart may include `my-large-file.foo`.

## Proposed Solution

The data calculation process for these charts needs to be revised. Before calculating the statistics, the process should first get the list of all files present in the latest commit. This list should then be used as the basis for all subsequent calculations, filtering out any historical data related to files that are not in this list.
