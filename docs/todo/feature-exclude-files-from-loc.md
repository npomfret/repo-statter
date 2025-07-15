# Feature: Exclude Files from Lines of Code (LOC) Statistics

**Status:** To Do

## Summary

The current lines of code (LOC) calculation includes every file within the repository, which can lead to inaccurate and inflated statistics by counting non-code assets. This feature will introduce a mechanism to exclude specific files and directories from the LOC calculation to provide more meaningful insights into the codebase.

## Initial Implementation (Phase 1)

A hardcoded default exclusion list will be implemented to filter out common non-source code files. This list will provide a sensible default for most projects.

### Default Exclusions

The following glob patterns will be excluded by default:

- **Images:** `*.jpg`, `*.jpeg`, `*.png`, `*.gif`, `*.svg`, `*.bmp`, `*.webp`
- **Documents:** `*.md`, `*.pdf`, `*.doc`, `*.docx`, `*.xls`, `*.xlsx`
- **Lock Files:** `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `composer.lock`
- **Build & Dependency Directories:** `node_modules/`, `dist/`, `build/`, `target/`, `vendor/`
- **Git Files:** `.git/`, `.gitignore`, `.gitattributes`
- **Configuration:** `.env`

## Future Implementation (Phase 2)

The exclusion list will be made configurable to allow users to tailor it to their specific project needs.

- A configuration file (e.g., `.repostatterrc.json`) will be introduced to allow users to define their own exclusion patterns.
- CLI arguments could provide a way to specify a custom configuration file path or override patterns for a single run.

## Acceptance Criteria

- The LOC statistics no longer count lines from files matching the default exclusion patterns.
- The overall accuracy and relevance of the repository statistics are improved.
