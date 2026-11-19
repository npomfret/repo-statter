# Repo Statter

CLI that analyses a git repository's history and writes an interactive HTML report.
Published to npm as `repo-statter` (v0.0.21; tags back to v0.0.7). A `repo-statter-v2/`
pnpm workspace is an in-tree rewrite with its own `package.json` and docs.
Lifecycle: published package; whether it is actively maintained and who depends on it
is not evidenced (status unknown). See `README.md` and `ARCHITECTURE.md`.

Tech: TypeScript, Node, commander, simple-git, esbuild, ApexCharts, vitest.

## Commands

- `npm test` (vitest), `npm run typecheck` (`lint` is the same `tsc --noEmit`), `npm run build`.
- `npm run analyse -- <repo>` runs the CLI from source.
- `npm run release` runs `npm version patch && npm publish`: it publishes to npm publicly, so run it only on explicit request.

<!-- agent-standards:begin -->
## Shared agent guidance

Before starting work, read [Scope](.agents/agent-standards/guidance/scope.md), [Running commands](.agents/agent-standards/guidance/commands.md), [Git](.agents/agent-standards/guidance/git.md), [Review before commit](.agents/agent-standards/guidance/review.md).
Before code changes: [State and dependencies](.agents/agent-standards/guidance/dependencies.md); Before UI changes: [Interface text](.agents/agent-standards/guidance/interface-text.md); Before tests or timeout changes: [Test timeouts](.agents/agent-standards/guidance/test-timeouts.md).
Keep the shared checkout on its default branch. Use detached worktrees. Agents commit, fast-forward land and push their verified, reviewed work.
- Be concise: lead with the outcome; give only the detail needed to act or decide.
- Do the work properly and verify it; never trade correctness for speed or cost.
- When options exist, recommend the best technical solution first, even if costlier; state cheaper alternatives separately with their trade-offs.
In Codex, use native skills and specialists for equivalent Claude invocations; referenced `.claude/` files remain canonical project knowledge.

*Managed by `npomfret/agent-standards`; edit the shared sources there.*
<!-- agent-standards:end -->
