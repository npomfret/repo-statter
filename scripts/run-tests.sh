#!/bin/bash

# Helper script to create test repo and run repo-statter against it

set -e

echo "🔧 Creating fresh test repository..."
# Capture the output and extract the TEST_REPO_PATH
CREATE_OUTPUT=$(./scripts/create-test-repo.sh)
echo "$CREATE_OUTPUT"
TEST_REPO_PATH=$(echo "$CREATE_OUTPUT" | grep "TEST_REPO_PATH=" | cut -d'=' -f2)

echo ""
echo "📊 Running repo-statter against test repository..."
npm start "$TEST_REPO_PATH"

echo ""
echo "✅ Test completed! Generated reports:"
echo "   📄 Main repo: dist/repo-statter.html"
echo "   🧪 Test repo: dist/test-repo.html"
echo ""
echo "🧹 Cleaning up test repo..."
rm -rf "$TEST_REPO_PATH"

echo "✨ Done!"