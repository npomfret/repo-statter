#!/bin/bash

# Helper script to create test repo and run repo-statter against it

set -e

echo "🔧 Creating fresh test repository..."
./scripts/create-test-repo.sh

echo ""
echo "📊 Running repo-statter against test repository..."
npm start test-repo

echo ""
echo "✅ Test completed! Generated reports:"
echo "   📄 Main repo: dist/repo-statter.html"
echo "   🧪 Test repo: dist/test-repo.html"
echo ""
echo "🧹 Cleaning up test repo..."
rm -rf test-repo

echo "✨ Done!"