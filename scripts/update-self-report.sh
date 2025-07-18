#!/bin/bash
set -e

echo "🔄 Regenerating self-report..."

# Generate the self-report directly to docs directory
npm run analyse . -- --output docs/repo-statter

# Rename the generated file to index.html
mv docs/repo-statter/repo-statter.html docs/repo-statter/index.html

echo "✅ Self-report updated in docs/repo-statter/"
echo "📝 Commit and push to update the live version:"
echo "   git add docs/repo-statter/"
echo "   git commit -m 'update: regenerate self-report'"
echo "   git push origin main"