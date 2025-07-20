#!/bin/bash
set -e

echo "🔄 Regenerating self-report..."

# Generate the self-report directly to docs directory
npm run analyse -- . -o docs/repo-statter

# Rename the generated file to index.html
mv docs/repo-statter/repo-statter.html docs/repo-statter/index.html

echo "✅ Updated doc for gh-pages"