# Plan: Publish Self-Report on GitHub Pages

This document outlines the steps required to automatically generate and publish the `repo-statter`'s own analysis report (the "self-report") to GitHub Pages.

## Goal

To have an up-to-date analysis report of the `repo-statter` repository itself, accessible via GitHub Pages (e.g., `https://<username>.github.io/repo-statter/`).

## Implementation Plan

### ✅ Step 1: Analyze Current Project Structure
- **Completed**: Identified that the project uses `tsx src/cli.ts` as the main entry point
- **Completed**: Confirmed `npm run analyse:self` script exists and works correctly
- **Completed**: Verified report generation outputs to `dist/repo-statter.html` and `dist/page-script.js`

### ✅ Step 2: Test Self-Report Generation
- **Completed**: Successfully tested `npm run analyse:self` 
- **Completed**: Confirmed it generates `repo-statter.html` and `page-script.js` in the `dist` directory
- **Completed**: Verified the report processes 240 commits and generates successfully

### ✅ Step 3: Create Directory Structure
- **Completed**: Created `examples/repo-statter/` directory to house the published report

### ✅ Step 4: Create GitHub Actions Workflow
- **Completed**: Created `.github/workflows/publish-self-report.yml` with the following features:
  - Triggers on push to main branch and weekly schedule (Monday 6 AM UTC)
  - Uses proper GitHub Pages permissions and concurrency controls
  - Installs dependencies with `npm ci`
  - Generates self-report using `npm run analyse:self`
  - Copies generated files to `examples/repo-statter/index.html` and `examples/repo-statter/page-script.js`
  - Deploys to GitHub Pages using official actions

### 🔄 Step 5: Configure GitHub Pages Settings
- **In Progress**: Need to configure repository settings to use GitHub Pages
- **Action Required**: In repository settings, configure Pages to deploy from GitHub Actions

### ⏳ Step 6: Test Complete Workflow
- **Pending**: Test the workflow by pushing changes and verifying deployment

## Technical Details

### Report Generation Command
- Uses existing `npm run analyse:self` script
- Outputs to `dist/repo-statter.html` and `dist/page-script.js`
- No build step required as TypeScript is executed directly with `tsx`

### GitHub Actions Workflow Features
- **Triggers**: Push to main branch + weekly schedule
- **Permissions**: Proper GitHub Pages permissions configured
- **Concurrency**: Prevents multiple deployments running simultaneously
- **Environment**: Uses `github-pages` environment for deployment
- **Caching**: Uses npm cache for faster builds

### File Structure
```
examples/
  repo-statter/
    index.html          # Renamed from repo-statter.html
    page-script.js      # JavaScript for interactive features
```

## Next Steps

1. **Configure GitHub Pages**: Set repository Pages settings to "Deploy from a branch" and select "GitHub Actions" as the source
2. **Test Deployment**: Push changes to main branch to trigger first deployment
3. **Verify Accessibility**: Check that the report is accessible at the GitHub Pages URL
4. **Monitor**: Ensure weekly updates work correctly

## Considerations

✅ **Report Size**: Generated report is reasonably sized with embedded assets
✅ **Asset Paths**: JavaScript file is properly referenced in HTML
✅ **Security**: Self-report contains no sensitive information
✅ **Performance**: Weekly updates prevent excessive build frequency
✅ **Maintenance**: Automated workflow requires no manual intervention
