# Feature: GitHub Integration for Repository Analysis

**Objective:** Enhance `repo-statter` to intelligently detect GitHub-hosted repositories, conditionally display a "View on GitHub" link, and provide direct links to individual commits on GitHub within the awards section.

## Implementation Status

### Phase 1: Repository Origin Detection ✅ COMPLETE
- `getGitHubUrl()` function already exists in `src/git/parser.ts:132-143`
- Extracts GitHub repository URLs from git remotes
- Handles both SSH and HTTPS formats

### Phase 2: Conditional "View on GitHub" Link ✅ COMPLETE  
- GitHub link conditionally displayed in template via `{{githubLink}}` 
- Implemented in `src/report/generator.ts:140`
- Shows "• GitHub" link only when repository is GitHub-hosted

### Phase 3: Link Commits to GitHub in Awards Section ❌ REMAINING WORK
**Current Issue:** Commit SHA links in awards section are placeholder `href="#"` links that don't go anywhere.

**Implementation Plan:**
1. Pass GitHub URL to client-side code in `src/report/generator.ts`
2. Update awards rendering in `src/chart/chart-initializer.ts:158-160` to create actual GitHub commit links
3. Construct URLs as: `https://github.com/{owner}/{repo}/commit/{sha}`
4. Add `target="_blank"` for new tab opening

**Files to modify:**
- `src/report/generator.ts`: Add `githubUrl` to page data (line 185)
- `src/chart/chart-initializer.ts`: Update awards rendering to use GitHub URLs (lines 158-160)  
- `src/chart/page-script.ts`: Add githubUrl to PageScriptData interface

**Small commit scope:** Focus only on making commit SHA links functional GitHub links when GitHub URL is available.
