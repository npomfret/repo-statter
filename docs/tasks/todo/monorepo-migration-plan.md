# Monorepo Migration Plan

## Objective

This document outlines the strategy and steps required to transition this project into a modern TypeScript monorepo. This will improve scalability, code sharing, and development workflow efficiency.

We will use industry-standard tools and best practices to ensure a robust and maintainable setup. Initially, the existing codebase will be migrated into a single application within the monorepo.

## Chosen Tooling

- **Package Manager:** `pnpm` - For its speed, efficiency, and superior handling of monorepo workspaces.
- **Build System:** `Turborepo` - For its high-performance build caching, incremental builds, and simplified monorepo task orchestration.
- **TypeScript:** Native Project References will be used to ensure efficient, incremental type-checking across the workspace.

## Migration Steps

### 1. Workspace Initialization (pnpm)

- Create a `pnpm-workspace.yaml` file in the project root to define the workspace packages (e.g., `apps/*`, `packages/*`).
- Remove `package-lock.json` and `node_modules`.
- Run `pnpm import` to generate a `pnpm-lock.yaml` from the existing `package.json`.
- Run `pnpm install` to establish the pnpm-managed workspace.

### 2. Build System Setup (Turborepo)

- Add `turbo` as a root-level development dependency: `pnpm add turbo --save-dev -w`.
- Create a `turbo.json` file in the root to configure the task pipeline (e.g., defining dependencies between `build`, `test`, and `lint` tasks).

### 3. Project Restructuring

- Create two new root directories: `apps` and `packages`.
- Move the entire existing codebase (`src`, `package.json`, `tsconfig.json`, etc.) into a new application directory: `apps/repo-statter`.

### 4. Package Configuration

- **Create a new root `package.json`:**
  - This file will be marked as `private: true`.
  - It will contain all shared `devDependencies` (e.g., `typescript`, `turbo`, `vitest`, `eslint`, `prettier`).
  - It will define workspace-level scripts (e.g., `"dev": "turbo dev"`, `"build": "turbo build"`, `"test": "turbo test"`).
- **Update `apps/repo-statter/package.json`:**
  - Give it a scoped name (e.g., `@repo-statter/app`).
  - Remove all `devDependencies` that were moved to the root `package.json`.
  - Keep only the `dependencies` specific to this application.

### 5. TypeScript Configuration

- **Create a root `tsconfig.base.json`:**
  - This file will contain the base TypeScript compiler options that will be shared across all projects in the monorepo.
- **Update `apps/repo-statter/tsconfig.json`:**
  - It should `extend` the new `tsconfig.base.json`.
  - Enable `"composite": true` to leverage TypeScript project references, which allows for faster incremental builds.
  - Adjust any paths to reflect the new directory structure.

### 6. Tooling and CI/CD Adjustments

- **Vitest, ESLint, Prettier:** Ensure their configurations are located at the root and are set up to apply to all packages within the `apps` and `packages` directories.
- **GitHub Actions / CI:** Update CI workflows to use `pnpm` for installation and `turbo` for running builds and tests. Turborepo's remote caching can be integrated for significantly faster CI runs.

### 7. Verification

- Run `pnpm install` from the root to ensure all dependencies are correctly installed and linked.
- Run `turbo build` to confirm that the application builds successfully.
- Run `turbo test` to execute all tests and ensure they pass.
- Manually run the application to confirm it operates as expected after the migration.

## Future Steps

- **Shared Packages:** Identify and extract reusable code (e.g., utility functions, git processors, chart components) into new packages within the `packages` directory (e.g., `packages/core-logic`, `packages/ui-components`).
- **New Applications:** New applications (e.g., a documentation website, a separate API service) can be easily added to the `apps` directory, leveraging the shared packages.
